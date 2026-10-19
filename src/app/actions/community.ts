"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { UserFacingError } from "@/lib/pdf";
import { assertUser, AuthError } from "@/lib/session";
import { COMMENT_MAX, COMMENTS_PER_WINDOW, COMMENT_WINDOW_MIN } from "@/lib/constants";

export type ActionState = { ok: boolean; message: string } | null;

function fail(err: unknown): { ok: false; message: string } {
  if (err instanceof UserFacingError || err instanceof AuthError) return { ok: false, message: err.message };
  if (err instanceof z.ZodError) return { ok: false, message: err.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  console.error("[community]", err);
  return { ok: false, message: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" };
}

const id = z.string().min(1).max(40);

/** Ratings and comments only exist on published sheets. */
async function publishedSheet(sheetId: string) {
  const sheet = await db.sheet.findUnique({ where: { id: sheetId }, select: { id: true, status: true, authorId: true } });
  if (!sheet || sheet.status !== "APPROVED") throw new UserFacingError("ไม่พบชีทนี้");
  return sheet;
}

function refresh(sheetId: string, authorId: string) {
  revalidatePath(`/sheets/${sheetId}`);
  revalidatePath(`/u/${authorId}`);
}

export async function rateSheet(sheetId: string, score: number): Promise<ActionState> {
  try {
    const user = await assertUser();
    const input = z
      .object({ sheetId: id, score: z.number().int().min(1, "ให้ได้ 1–5 ดาว").max(5, "ให้ได้ 1–5 ดาว") })
      .parse({ sheetId, score });
    const sheet = await publishedSheet(input.sheetId);
    if (sheet.authorId === user.id) throw new UserFacingError("ให้ดาวชีทของตัวเองไม่ได้");

    await db.rating.upsert({
      where: { sheetId_userId: { sheetId: sheet.id, userId: user.id } },
      create: { sheetId: sheet.id, userId: user.id, score: input.score },
      update: { score: input.score },
    });
    refresh(sheet.id, sheet.authorId);
    return { ok: true, message: `ให้ ${input.score} ดาวแล้ว` };
  } catch (err) {
    return fail(err);
  }
}

const commentInput = z.object({
  sheetId: id,
  body: z
    .string()
    .trim()
    .min(1, "กรุณาพิมพ์ความคิดเห็น")
    .max(COMMENT_MAX, `ความคิดเห็นยาวได้ไม่เกิน ${COMMENT_MAX} ตัวอักษร`),
});

export async function addComment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const user = await assertUser();
    const { sheetId, body } = commentInput.parse({ sheetId: formData.get("sheetId"), body: formData.get("body") });
    const sheet = await publishedSheet(sheetId);

    const since = new Date(Date.now() - COMMENT_WINDOW_MIN * 60 * 1000);
    const recent = await db.comment.count({ where: { userId: user.id, createdAt: { gte: since } } });
    if (recent >= COMMENTS_PER_WINDOW) {
      throw new UserFacingError(`แสดงความคิดเห็นได้ไม่เกิน ${COMMENTS_PER_WINDOW} ครั้งใน ${COMMENT_WINDOW_MIN} นาที`);
    }

    await db.comment.create({ data: { sheetId: sheet.id, userId: user.id, body } });
    refresh(sheet.id, sheet.authorId);
    return { ok: true, message: "ส่งความคิดเห็นแล้ว" };
  } catch (err) {
    return fail(err);
  }
}

/** The comment's writer or an admin can delete it. */
export async function deleteComment(commentId: string): Promise<ActionState> {
  try {
    const user = await assertUser();
    const comment = await db.comment.findUnique({
      where: { id: id.parse(commentId) },
      select: { id: true, userId: true, sheet: { select: { id: true, authorId: true } } },
    });
    if (!comment) throw new UserFacingError("ไม่พบความคิดเห็นนี้");
    if (comment.userId !== user.id && !user.isAdmin) throw new AuthError("ลบได้เฉพาะความคิดเห็นของตัวเอง");

    await db.comment.delete({ where: { id: comment.id } });
    refresh(comment.sheet.id, comment.sheet.authorId);
    return { ok: true, message: "ลบความคิดเห็นแล้ว" };
  } catch (err) {
    return fail(err);
  }
}
