import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recordView } from "@/lib/queries";
import { getCurrentUser, loginUrl } from "@/lib/session";
import { withBase } from "@/lib/urls";

/**
 * "อ่านชีท": signed-out readers go to login first (and come back here),
 * signed-in readers are counted once and sent to the sheet on Google Drive.
 */
export async function GET(req: Request, ctx: RouteContext<"/sheets/[id]/read">) {
  const { id } = await ctx.params;
  const here = `/sheets/${id}/read`;
  const detail = new URL(withBase(`/sheets/${id}`), req.url);

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL(withBase(loginUrl(here)), req.url));

  const sheet = await db.sheet.findUnique({ where: { id }, select: { status: true, driveUrl: true, pdfKey: true } });
  if (!sheet || sheet.status !== "APPROVED") return NextResponse.redirect(detail);

  await recordView(id, user.id);

  // Prototype sheets have no file: return to the detail page
  if (!sheet.driveUrl || sheet.pdfKey.startsWith("demo/")) return NextResponse.redirect(detail);
  return NextResponse.redirect(sheet.driveUrl);
}
