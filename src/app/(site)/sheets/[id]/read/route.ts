import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { presignPdfGet } from "@/lib/r2";
import { recordView } from "@/lib/queries";
import { getCurrentUser, loginUrl, registerUrl } from "@/lib/session";
import { withBase } from "@/lib/urls";

/**
 * "อ่านชีท": signed-out readers go to login first (and come back here),
 * signed-in readers are counted once and sent to a 5-minute R2 link of the PDF.
 */
export async function GET(req: Request, ctx: RouteContext<"/sheets/[id]/read">) {
  const { id } = await ctx.params;
  const here = `/sheets/${id}/read`;
  // Redirect on the public origin (req.url may carry a *.vercel.app host)
  const origin = process.env.BETTER_AUTH_URL ?? req.url;
  const detail = new URL(withBase(`/sheets/${id}`), origin);

  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL(withBase(loginUrl(here)), origin));
  if (!user.registered) return NextResponse.redirect(new URL(withBase(registerUrl(here)), origin));

  const sheet = await db.sheet.findUnique({ where: { id }, select: { status: true, title: true, pdfKey: true } });
  if (!sheet || sheet.status !== "APPROVED") return NextResponse.redirect(detail);

  await recordView(id, user.id);

  // Prototype sheets have no file: return to the detail page
  if (sheet.pdfKey.startsWith("demo/")) return NextResponse.redirect(detail);

  const res = NextResponse.redirect(await presignPdfGet(sheet.pdfKey, `${sheet.title}.pdf`));
  // The signed link is personal and short-lived: never cache the redirect
  res.headers.set("Cache-Control", "private, no-store");
  return res;
}
