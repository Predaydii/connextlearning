import { getObjectStream } from "@/lib/r2";

// Only admin-uploaded cover images are public; everything else in the bucket stays private.
const PUBLIC_KEY = /^covers\/[a-f0-9-]{36}-(640|1280)\.webp$/;

export async function GET(_req: Request, ctx: RouteContext<"/media/[...key]">) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (!PUBLIC_KEY.test(key)) return new Response("Not found", { status: 404 });
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
