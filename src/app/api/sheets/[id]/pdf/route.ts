import { db } from "@/lib/db";
import { getObjectStream } from "@/lib/r2";
import { getCurrentUser } from "@/lib/session";

/** Private preview of the merged PDF for admins (review) and the sheet's author. */
export async function GET(_req: Request, ctx: RouteContext<"/api/sheets/[id]/pdf">) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const sheet = await db.sheet.findUnique({ where: { id }, select: { pdfKey: true, authorId: true } });
  if (!sheet || (!user.isAdmin && sheet.authorId !== user.id)) return new Response("Not found", { status: 404 });

  let file: Awaited<ReturnType<typeof getObjectStream>>;
  try {
    file = await getObjectStream(sheet.pdfKey);
  } catch (err) {
    console.error("[pdf] could not read from R2", err);
    return new Response("ไม่สามารถโหลดไฟล์ได้ในขณะนี้", { status: 502, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  const { stream, size } = file;
  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="sheet-${id}.pdf"`,
      ...(size ? { "Content-Length": String(size) } : {}),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
