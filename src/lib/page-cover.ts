import "server-only";
import path from "node:path";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { putObject } from "@/lib/r2";

// pdf.js data files, shipped with the functions via outputFileTracingIncludes (next.config.ts)
const PDFJS_DIR = path.join(process.cwd(), "node_modules/pdfjs-dist");

/** Render page 1 of a PDF and keep its top as 16:9 WebP covers (1280 and 640 wide). */
export async function renderPageCover(pdf: Uint8Array) {
  const [{ getDocument }, { createCanvas }] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("@napi-rs/canvas"),
  ]);
  const doc = await getDocument({
    data: pdf.slice(), // pdf.js takes ownership of the buffer
    isEvalSupported: false,
    disableFontFace: true,
    standardFontDataUrl: `${PDFJS_DIR}/standard_fonts/`,
    cMapUrl: `${PDFJS_DIR}/cmaps/`,
    cMapPacked: true,
  }).promise;
  try {
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 1280 / page.getViewport({ scale: 1 }).width });
    const canvas = createCanvas(Math.round(viewport.width), Math.round(viewport.height));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // @napi-rs/canvas implements the 2D context pdf.js draws with
    await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise;
    const png = await canvas.encode("png");
    const [large, small] = await Promise.all(
      [1280, 640].map((width) =>
        sharp(png).resize({ width, height: Math.round((width * 9) / 16), fit: "cover", position: "top" }).webp({ quality: 80 }).toBuffer(),
      ),
    );
    return { large, small };
  } finally {
    await doc.destroy();
  }
}

/** Store the first-page cover in R2; returns its key prefix, or null when the page can't be drawn. */
export async function storePageCover(pdf: Uint8Array): Promise<string | null> {
  try {
    const { large, small } = await renderPageCover(pdf);
    const key = `covers/${randomUUID()}`;
    const immutable = "public, max-age=31536000, immutable";
    await Promise.all([
      putObject(`${key}-1280.webp`, large, "image/webp", immutable),
      putObject(`${key}-640.webp`, small, "image/webp", immutable),
    ]);
    return key;
  } catch (err) {
    // A missing cover only means the subject cover is shown instead
    console.error("[page-cover]", err);
    return null;
  }
}
