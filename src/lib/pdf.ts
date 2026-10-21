import "server-only";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { MAX_PAGES } from "@/lib/constants";

export class UserFacingError extends Error {}

export type FileKind = "pdf" | "png" | "jpg";

/** Detect the real file type from its first bytes (never trust the extension / MIME). */
export function sniffKind(bytes: Uint8Array): FileKind | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
      bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  // "%PDF-" may be preceded by a little junk; the spec allows it within the first 1 KB
  const head = Buffer.from(bytes.subarray(0, 1024)).toString("latin1");
  if (head.includes("%PDF-")) return "pdf";
  return null;
}

const A4_WIDTH_PT = 595.28;
const MAX_IMAGE_EDGE = 2480; // ≈ A4 @ 300 dpi

async function normaliseImage(bytes: Uint8Array) {
  try {
    const img = sharp(bytes, { limitInputPixels: 120_000_000, failOn: "error" })
      .rotate() // honour EXIF orientation, then EXIF is dropped
      .resize({ width: MAX_IMAGE_EDGE, height: MAX_IMAGE_EDGE, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 85, mozjpeg: true });
    const { data, info } = await img.toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    throw new UserFacingError("ไม่สามารถอ่านไฟล์รูปภาพได้ ไฟล์อาจเสียหาย");
  }
}

/**
 * Merge PDFs and images (in the given order) into a single PDF.
 * Images become one page each, sized to A4 width with their own aspect ratio.
 */
export async function mergeToPdf(
  files: { bytes: Uint8Array; kind: FileKind }[],
  meta: { title: string; author: string; subject: string },
) {
  const out = await PDFDocument.create();
  out.setTitle(meta.title);
  out.setAuthor(meta.author);
  out.setSubject(meta.subject);
  out.setCreator("Connext Learning");
  out.setProducer("Connext Learning");

  for (const file of files) {
    if (file.kind === "pdf") {
      let src: PDFDocument;
      try {
        src = await PDFDocument.load(file.bytes, { updateMetadata: false });
      } catch (err) {
        const encrypted = err instanceof Error && /encrypt/i.test(err.message);
        throw new UserFacingError(
          encrypted ? "ไฟล์ PDF ถูกตั้งรหัสผ่าน/ล็อกไว้ กรุณาปลดล็อกก่อนอัปโหลด" : "ไม่สามารถอ่านไฟล์ PDF ได้ ไฟล์อาจเสียหาย",
        );
      }
      if (out.getPageCount() + src.getPageCount() > MAX_PAGES) {
        throw new UserFacingError(`จำนวนหน้ารวมเกิน ${MAX_PAGES} หน้า`);
      }
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    } else {
      if (out.getPageCount() + 1 > MAX_PAGES) throw new UserFacingError(`จำนวนหน้ารวมเกิน ${MAX_PAGES} หน้า`);
      const img = await normaliseImage(file.bytes);
      const embedded = await out.embedJpg(img.data);
      const w = A4_WIDTH_PT;
      const h = (img.height / img.width) * A4_WIDTH_PT;
      const page = out.addPage([w, h]);
      page.drawImage(embedded, { x: 0, y: 0, width: w, height: h });
    }
  }

  if (out.getPageCount() === 0) throw new UserFacingError("ไม่พบหน้าเอกสารในไฟล์ที่อัปโหลด");
  const bytes = await out.save({ useObjectStreams: true });
  return { bytes, pageCount: out.getPageCount() };
}

/**
 * Two WebP crops (`widths`, large first); `ratio` is height / width
 * (16:9 covers by default, 5/4 for 4:5 tiles, 0.3 for 2000×600 banners).
 */
export async function makeCoverImages(bytes: Uint8Array, ratio = 9 / 16, widths: [number, number] = [1280, 640]) {
  const kind = sniffKind(bytes);
  const isWebp = bytes.length > 12 && Buffer.from(bytes.subarray(0, 4)).toString("latin1") === "RIFF" &&
    Buffer.from(bytes.subarray(8, 12)).toString("latin1") === "WEBP";
  if (kind !== "png" && kind !== "jpg" && !isWebp) throw new UserFacingError("รองรับเฉพาะไฟล์ PNG, JPG หรือ WebP");
  try {
    const base = sharp(bytes, { limitInputPixels: 60_000_000 }).rotate();
    const [large, small] = await Promise.all(
      widths.map((width) =>
        base
          .clone()
          .resize({ width, height: Math.round(width * ratio), fit: "cover", position: "attention" })
          .webp({ quality: 80 })
          .toBuffer(),
      ),
    );
    return { large, small };
  } catch {
    throw new UserFacingError("ไม่สามารถอ่านไฟล์รูปภาพได้");
  }
}

/** Site icon: square PNGs (32 tab icon, 180 Apple touch icon, 512 PWA/large). */
export async function makeIconImages(bytes: Uint8Array) {
  assertImage(bytes);
  try {
    const base = sharp(bytes, { limitInputPixels: 60_000_000 }).rotate();
    const [s32, s180, s512] = await Promise.all(
      [32, 180, 512].map((size) => base.clone().resize({ width: size, height: size, fit: "cover", position: "attention" }).png().toBuffer()),
    );
    return { s32, s180, s512 };
  } catch {
    throw new UserFacingError("ไม่สามารถอ่านไฟล์รูปภาพได้");
  }
}

/** Link-preview image: 1200×630 JPEG (the most widely supported og:image format). */
export async function makeOgImage(bytes: Uint8Array) {
  assertImage(bytes);
  try {
    return await sharp(bytes, { limitInputPixels: 60_000_000 }).rotate().resize({ width: 1200, height: 630, fit: "cover", position: "attention" }).jpeg({ quality: 85 }).toBuffer();
  } catch {
    throw new UserFacingError("ไม่สามารถอ่านไฟล์รูปภาพได้");
  }
}

function assertImage(bytes: Uint8Array) {
  const kind = sniffKind(bytes);
  const isWebp = bytes.length > 12 && Buffer.from(bytes.subarray(0, 4)).toString("latin1") === "RIFF" &&
    Buffer.from(bytes.subarray(8, 12)).toString("latin1") === "WEBP";
  if (kind !== "png" && kind !== "jpg" && !isWebp) throw new UserFacingError("รองรับเฉพาะไฟล์ PNG, JPG หรือ WebP");
}
