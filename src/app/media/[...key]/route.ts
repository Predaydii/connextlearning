import { getObjectStream, presignVideoGet } from "@/lib/r2";

// Only admin-uploaded images and videos are public; everything else in the bucket stays private.
const PUBLIC_IMAGE = /^covers\/[a-f0-9-]{36}-(640|1000|1280|2000)\.webp$/;
const PUBLIC_VIDEO = /^videos\/[a-f0-9-]{36}\.(mp4|webm)$/;
// Admin-set site icon (PNG sizes) and link-preview image (JPEG)
const PUBLIC_SITE = /^covers\/[a-f0-9-]{36}-(icon-(32|180|512)\.png|og\.jpg)$/;

export async function GET(_req: Request, ctx: RouteContext<"/media/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");

  if (PUBLIC_VIDEO.test(key)) {
    // Videos are big and seekable: send the browser to R2 itself (range requests, no function bandwidth).
    // The link lives 12 h; the redirect is cached (browser + Vercel CDN) for 1 h so it never hands out a nearly expired one.
    return new Response(null, {
      status: 302,
      headers: { Location: await presignVideoGet(key), "Cache-Control": "public, max-age=3600, s-maxage=3600" },
    });
  }

  const site = PUBLIC_SITE.test(key);
  if (!site && !PUBLIC_IMAGE.test(key)) return new Response("Not found", { status: 404 });
  try {
    const { stream, size } = await getObjectStream(key);
    return new Response(stream, {
      headers: {
        "Content-Type": site ? (key.endsWith(".png") ? "image/png" : "image/jpeg") : "image/webp",
        ...(size ? { "Content-Length": String(size) } : {}),
        // Keys are content-unique (new upload = new UUID), so cache forever at the CDN and browser.
        // s-maxage is what lets Vercel's CDN keep it: without it every view runs this function again.
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
