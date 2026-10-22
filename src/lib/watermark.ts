import "server-only";
import path from "node:path";
import type { PDFDocument } from "pdf-lib";

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

/**
 * A faint logo + copyright mark in the middle of every page; tall pages (long
 * screenshots) get one mark per screen-height so a crop cannot drop it.
 */
export async function addWatermark(doc: PDFDocument, author: string) {
  const mark = await doc.embedPng(await watermarkImage(author));
  for (const page of doc.getPages()) {
    // ponytail: pages with a /Rotate entry get the mark turned with them; counter-rotate if that ever shows up
    const { x: ox, y: oy, width, height } = page.getMediaBox();
    const w = width * 0.55;
    const h = (mark.height / mark.width) * w;
    const count = Math.max(1, Math.round(height / (width * 1.3)));
    for (let i = 0; i < count; i++) {
      const cy = (height * (i + 0.5)) / count;
      page.drawImage(mark, { x: ox + (width - w) / 2, y: oy + cy - h / 2, width: w, height: h, opacity: 0.12 });
    }
  }
}
