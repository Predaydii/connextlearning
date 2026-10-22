import "server-only";
import path from "node:path";
import { degrees, type PDFDocument } from "pdf-lib";

// Shipped with the functions via outputFileTracingIncludes (next.config.ts)
const FONT = path.join(process.cwd(), "src/lib/fonts/Prompt-SemiBold.ttf");
const LOGO = path.join(process.cwd(), "public/img/logo-480.webp");
const FAMILY = "Watermark Prompt";

/** Logo with "<author> สงวนลิขสิทธิ์" under it, as a transparent PNG (1000 px wide). */
export async function watermarkImage(author: string) {
  const { createCanvas, loadImage, GlobalFonts } = await import("@napi-rs/canvas");
  if (!GlobalFonts.has(FAMILY)) GlobalFonts.registerFromPath(FONT, FAMILY);
  const logo = await loadImage(LOGO);

  const W = 1000;
  const logoW = 600;
  const logoH = Math.round((logo.height / logo.width) * logoW);
  const text = `${author.trim()} สงวนลิขสิทธิ์`;
  const canvas = createCanvas(W, logoH + 130);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(logo, (W - logoW) / 2, 0, logoW, logoH);

  // Long names shrink to fit the width
  let size = 64;
  do {
    ctx.font = `${size}px "${FAMILY}"`;
  } while (ctx.measureText(text).width > W - 40 && --size > 24);
  ctx.fillStyle = "#13237a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, W / 2, logoH + 70);
  return canvas.encode("png");
}

/** R2 prefix of sheet PDFs that carry this watermark; older ones get it from the admin button. */
export const WATERMARKED_PREFIX = "sheets/w/";

/** Sheet filter: uploaded before the watermark (demo sheets have no file). */
export const UNWATERMARKED = { NOT: [{ pdfKey: { startsWith: WATERMARKED_PREFIX } }, { pdfKey: { startsWith: "demo/" } }] };

/**
 * The mark tiled diagonally over the whole page (staggered rows, faint), so no crop
 * of the page can leave it out. Long pages simply get more rows.
 */
export async function addWatermark(doc: PDFDocument, author: string) {
  const mark = await doc.embedPng(await watermarkImage(author));
  const angle = 30;
  const t = (angle * Math.PI) / 180;
  for (const page of doc.getPages()) {
    // ponytail: pages with a /Rotate entry get the pattern turned with them; counter-rotate if that ever shows up
    const { x: ox, y: oy, width, height } = page.getMediaBox();
    const w = width * 0.5;
    const h = (mark.height / mark.width) * w;
    const dx = width * 0.62;
    const dy = width * 0.36;
    for (let row = 0, cy = dy / 2; cy < height + dy; row++, cy += dy) {
      for (let cx = row % 2 ? 0 : dx / 2; cx < width + dx; cx += dx) {
        // drawImage rotates around the image's corner: place that corner so the centre lands on (cx, cy)
        page.drawImage(mark, {
          x: ox + cx - (w / 2) * Math.cos(t) + (h / 2) * Math.sin(t),
          y: oy + cy - (w / 2) * Math.sin(t) - (h / 2) * Math.cos(t),
          width: w,
          height: h,
          rotate: degrees(angle),
          opacity: 0.09,
        });
      }
    }
  }
}
