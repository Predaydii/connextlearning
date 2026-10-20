import { getObjectStream, presignVideoGet } from "@/lib/r2";

// Only admin-uploaded images and videos are public; everything else in the bucket stays private.
const PUBLIC_IMAGE = /^covers\/[a-f0-9-]{36}-(640|1280)\.webp$/;
const PUBLIC_VIDEO = /^videos\/[a-f0-9-]{36}\.(mp4|webm)$/;

export async function GET(_req: Request, ctx: RouteContext<"/media/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");

  if (PUBLIC_VIDEO.test(key)) {
    // Videos are big and seekable: send the browser to R2 itself (range requests, no function bandwidth).
    // The link lives 12 h; the redirect is cached for 1 h so it never hands out a nearly expired one.
    return new Response(null, {
      status: 302,
      headers: { Location: await presignVideoGet(key), "Cache-Control": "public, max-age=3600" },
    });
  }

  if (!PUBLIC_IMAGE.test(key)) return new Response("Not found", { status: 404 });
  try {
    const { stream, size } = await getObjectStream(key);
    return new Response(stream, {
      headers: {
        "Content-Type": "image/webp",
        ...(size ? { "Content-Length": String(size) } : {}),
        // Keys are content-unique (new upload = new UUID), so cache forever at the CDN and browser
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
