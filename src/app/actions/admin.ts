"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { deleteObjects, putObject } from "@/lib/r2";
import { makeCoverImages, UserFacingError } from "@/lib/pdf";
import { assertAdmin, AuthError } from "@/lib/session";
import { TAG_NEWS, TAG_SETTINGS, TAG_SHEETS } from "@/lib/queries";
import { SUBJECT_IDS } from "@/lib/constants";

export type ActionState = { ok: boolean; message: string } | null;

function fail(err: unknown): { ok: false; message: string } {
  if (err instanceof UserFacingError || err instanceof AuthError) return { ok: false, message: err.message };
  if (err instanceof z.ZodError) return { ok: false, message: err.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  console.error("[admin]", err);
  return { ok: false, message: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" };
}

const sheetId = z.string().min(1).max(40);

function refreshSheets(id?: string) {
  updateTag(TAG_SHEETS);
  revalidatePath("/admin", "layout");
  if (id) revalidatePath(`/sheets/${id}`);
}

// ---------------------------------------------------------------------------
// Review
// ---------------------------------------------------------------------------

export async function approveSheet(id: string): Promise<ActionState> {
  try {
    const admin = await assertAdmin();
    const sheet = await db.sheet.findUnique({ where: { id: sheetId.parse(id) } });
    if (!sheet) throw new UserFacingError("ไม่พบชีทนี้");
    if (sheet.status === "APPROVED") return { ok: true, message: "ชีทนี้เผยแพร่อยู่แล้ว" };

    // The PDF already sits in R2; readers get a short-lived link to it (see /sheets/[id]/read)
    await db.sheet.update({
      where: { id: sheet.id },
      data: {
        status: "APPROVED",
        rejectReason: null,
        reviewedById: admin.id,
        reviewedAt: new Date(),
        publishedAt: sheet.publishedAt ?? new Date(),
      },
    });
    refreshSheets(sheet.id);
    return { ok: true, message: "อนุมัติและเผยแพร่ชีทแล้ว" };
  } catch (err) {
    return fail(err);
  }
}

const rejectInput = z.object({
  id: sheetId,
  reason: z.string().trim().min(3, "กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร").max(500),
});

export async function rejectSheet(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const admin = await assertAdmin();
    const { id, reason } = rejectInput.parse({ id: formData.get("id"), reason: formData.get("reason") });
    const sheet = await db.sheet.findUnique({ where: { id }, select: { id: true } });
    if (!sheet) throw new UserFacingError("ไม่พบชีทนี้");

    // Hidden from readers at once (/read only serves APPROVED sheets); the PDF
    // stays in R2 so the sheet can still be re-approved later.
    await db.sheet.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectReason: reason,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });
    refreshSheets(id);
    return { ok: true, message: "ไม่อนุมัติชีทแล้ว" };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteSheet(id: string): Promise<ActionState> {
  try {
    await assertAdmin();
    const sheet = await db.sheet.findUnique({ where: { id: sheetId.parse(id) } });
    if (!sheet) throw new UserFacingError("ไม่พบชีทนี้");
    await db.sheet.delete({ where: { id: sheet.id } });
    await deleteObjects([sheet.pdfKey, ...(sheet.coverKey ? coverFiles(sheet.coverKey) : [])]);
    refreshSheets(sheet.id);
    return { ok: true, message: "ลบชีทแล้ว" };
  } catch (err) {
    return fail(err);
  }
}

// ---------------------------------------------------------------------------
// Covers (16:9)
// ---------------------------------------------------------------------------

const MAX_COVER_BYTES = 5 * 1024 * 1024;

function coverFiles(key: string) {
  return [`${key}-1280.webp`, `${key}-640.webp`];
}

async function storeCover(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) throw new UserFacingError("กรุณาเลือกไฟล์รูปภาพ");
  if (file.size > MAX_COVER_BYTES) throw new UserFacingError("รูปภาพต้องมีขนาดไม่เกิน 5 MB");
  const { large, small } = await makeCoverImages(new Uint8Array(await file.arrayBuffer()));
  const key = `covers/${randomUUID()}`;
  const immutable = "public, max-age=31536000, immutable";
  await Promise.all([
    putObject(`${key}-1280.webp`, large, "image/webp", immutable),
    putObject(`${key}-640.webp`, small, "image/webp", immutable),
  ]);
  return key;
}

const coverTarget = z.union([
  z.literal("uniform"),
  z.enum(SUBJECT_IDS).transform((id) => ({ subject: id })),
  z.string().regex(/^sheet:.+$/).transform((v) => ({ sheet: v.slice(6) })),
]);

async function currentCoverKey(target: z.output<typeof coverTarget>) {
  if (target === "uniform") return (await db.siteSetting.findUnique({ where: { id: 1 } }))?.uniformCoverKey ?? null;
  if ("subject" in target) return (await db.subject.findUnique({ where: { id: target.subject } }))?.coverKey ?? null;
  return (await db.sheet.findUnique({ where: { id: target.sheet } }))?.coverKey ?? null;
}

async function saveCoverKey(target: z.output<typeof coverTarget>, key: string | null) {
  if (target === "uniform") {
    await db.siteSetting.upsert({ where: { id: 1 }, create: { id: 1, uniformCoverKey: key }, update: { uniformCoverKey: key } });
  } else if ("subject" in target) {
    await db.subject.update({ where: { id: target.subject }, data: { coverKey: key } });
  } else {
    await db.sheet.update({ where: { id: target.sheet }, data: { coverKey: key } });
  }
}

/** Upload a new cover (formData: target, file) or reset to default (formData: target, reset=1). */
export async function updateCover(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const target = coverTarget.parse(formData.get("target"));
    const old = await currentCoverKey(target);
    const reset = formData.get("reset") === "1";
    const key = reset ? null : await storeCover(formData.get("file"));
    await saveCoverKey(target, key);
    if (old) await deleteObjects(coverFiles(old));

    updateTag(TAG_SETTINGS);
    updateTag(TAG_SHEETS);
    revalidatePath("/admin", "layout");
    return { ok: true, message: reset ? "กลับไปใช้ภาพเริ่มต้นแล้ว" : "บันทึกภาพปกแล้ว" };
  } catch (err) {
    return fail(err);
  }
}

export async function setCoverMode(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const mode = z.enum(["SUBJECT", "UNIFORM"]).parse(formData.get("mode"));
    await db.siteSetting.upsert({ where: { id: 1 }, create: { id: 1, coverMode: mode }, update: { coverMode: mode } });
    updateTag(TAG_SETTINGS);
    updateTag(TAG_SHEETS);
    revalidatePath("/admin", "layout");
    return { ok: true, message: mode === "UNIFORM" ? "ใช้ภาพปกเดียวกันทุกชีทแล้ว" : "ใช้ภาพปกแยกตามวิชาแล้ว" };
  } catch (err) {
    return fail(err);
  }
}

// ---------------------------------------------------------------------------
// News page
// ---------------------------------------------------------------------------

function refreshNews() {
  updateTag(TAG_NEWS);
  revalidatePath("/admin", "layout");
}

const YT_ID = /^[\w-]{11}$/;

/** Accepts youtu.be/…, youtube.com/watch?v=…, /shorts/…, /embed/…, /live/… or a bare id. */
function youtubeId(input: string): string | null {
  if (YT_ID.test(input)) return input;
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^(www|m)\./, "");
    const id =
      host === "youtu.be"
        ? url.pathname.slice(1)
        : host === "youtube.com" || host === "youtube-nocookie.com"
          ? (url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)?.[1])
          : null;
    return id && YT_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** formData: url (empty = remove the video). */
export async function setNewsVideo(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const raw = z.string().trim().max(300).parse(formData.get("url") ?? "");
    const id = raw ? youtubeId(raw) : null;
    if (raw && !id) throw new UserFacingError("ลิงก์ YouTube ไม่ถูกต้อง");
    await db.siteSetting.upsert({ where: { id: 1 }, create: { id: 1, newsVideoId: id }, update: { newsVideoId: id } });
    refreshNews();
    return { ok: true, message: id ? "บันทึกวิดีโอแล้ว" : "นำวิดีโอออกแล้ว" };
  } catch (err) {
    return fail(err);
  }
}

const newsInput = z.object({
  id: z.string().max(40).optional(),
  title: z.string().trim().min(1, "กรุณากรอกหัวข้อข่าว").max(150, "หัวข้อข่าวยาวเกิน 150 ตัวอักษร"),
  summary: z.string().trim().min(1, "กรุณากรอกรายละเอียด").max(1000, "รายละเอียดยาวเกิน 1000 ตัวอักษร"),
  linkUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => !v || /^https?:\/\//i.test(v), "ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://")
    .transform((v) => v || null),
  publishedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ไม่ถูกต้อง")
    .transform((v) => new Date(`${v}T12:00:00+07:00`)),
});

/** Create (no id) or update a news card. formData: id?, title, summary, linkUrl, publishedAt, file?, removeImage? */
export async function saveNewsPost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const input = newsInput.parse({
      id: formData.get("id") || undefined,
      title: formData.get("title"),
      summary: formData.get("summary"),
      linkUrl: formData.get("linkUrl") ?? "",
      publishedAt: formData.get("publishedAt"),
    });
    const existing = input.id ? await db.newsPost.findUnique({ where: { id: input.id } }) : null;
    if (input.id && !existing) throw new UserFacingError("ไม่พบข่าวนี้");

    const file = formData.get("file");
    const hasFile = file instanceof File && file.size > 0;
    const removeImage = formData.get("removeImage") === "1";
    const imageKey = hasFile ? await storeCover(file) : removeImage ? null : (existing?.imageKey ?? null);

    const data = { title: input.title, summary: input.summary, linkUrl: input.linkUrl, publishedAt: input.publishedAt, imageKey };
    if (existing) await db.newsPost.update({ where: { id: existing.id }, data });
    else await db.newsPost.create({ data });
    if (existing?.imageKey && existing.imageKey !== imageKey) await deleteObjects(coverFiles(existing.imageKey));

    refreshNews();
    return { ok: true, message: existing ? "บันทึกการแก้ไขแล้ว" : "เพิ่มข่าวแล้ว" };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteNewsPost(id: string): Promise<ActionState> {
  try {
    await assertAdmin();
    const post = await db.newsPost.findUnique({ where: { id: z.string().min(1).max(40).parse(id) } });
    if (!post) throw new UserFacingError("ไม่พบข่าวนี้");
    await db.newsPost.delete({ where: { id: post.id } });
    if (post.imageKey) await deleteObjects(coverFiles(post.imageKey));
    refreshNews();
    return { ok: true, message: "ลบข่าวแล้ว" };
  } catch (err) {
    return fail(err);
  }
}
