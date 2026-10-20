"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { adminHref } from "@/lib/urls";
import { z } from "zod";
import { db } from "@/lib/db";
import { deleteObjects, headObject, presignPut, putObject } from "@/lib/r2";
import { makeCoverImages, UserFacingError } from "@/lib/pdf";
import { assertAdmin, assertSuperAdmin, AuthError } from "@/lib/session";
import { adminEmails } from "@/lib/env";
import { TAG_NEWS, TAG_SETTINGS, TAG_SHEETS } from "@/lib/queries";
import {
  ACADEMIC_YEARS,
  DESCRIPTION_MAX,
  GRADE_VALUES,
  gradeLabel,
  MAX_VIDEO_BYTES,
  SCHOOL_DOMAIN,
  SEMESTERS,
  SUBJECT_IDS,
  SUBJECTS,
  TITLE_MAX,
  VIDEO_TYPES,
} from "@/lib/constants";

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

/** Take a published sheet off the public site (approveSheet shows it again). */
export async function hideSheet(id: string): Promise<ActionState> {
  try {
    await assertAdmin();
    const sheet = await db.sheet.findUnique({ where: { id: sheetId.parse(id) }, select: { id: true, status: true } });
    if (!sheet) throw new UserFacingError("ไม่พบชีทนี้");
    if (sheet.status !== "APPROVED") throw new UserFacingError("ซ่อนได้เฉพาะชีทที่เผยแพร่อยู่");
    await db.sheet.update({ where: { id: sheet.id }, data: { status: "HIDDEN" } });
    refreshSheets(sheet.id);
    return { ok: true, message: "ซ่อนจากหน้าสาธารณะแล้ว" };
  } catch (err) {
    return fail(err);
  }
}

const detailsInput = z.object({
  id: sheetId,
  title: z.string().trim().min(1, "กรุณากรอกชื่อชีท").max(TITLE_MAX, `ชื่อชีทยาวได้ไม่เกิน ${TITLE_MAX} ตัวอักษร`),
  description: z.string().trim().min(1, "กรุณากรอกคำอธิบาย").max(DESCRIPTION_MAX, `คำอธิบายยาวได้ไม่เกิน ${DESCRIPTION_MAX} ตัวอักษร`),
  subjectId: z.enum(SUBJECT_IDS, { message: "กรุณาเลือกวิชา" }),
  grade: z.enum(GRADE_VALUES, { message: "กรุณาเลือกระดับชั้น" }),
  semester: z.coerce.number().refine((n) => (SEMESTERS as readonly number[]).includes(n), "กรุณาเลือกภาคเรียน"),
  academicYear: z.coerce.number().refine((n) => (ACADEMIC_YEARS as readonly number[]).includes(n), "กรุณาเลือกปีการศึกษา"),
});

/** Admins can correct everything the sender chose (title, description, subject, grade, term). */
export async function updateSheetDetails(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const { id, ...data } = detailsInput.parse(Object.fromEntries(formData));
    const subject = SUBJECTS.find((s) => s.id === data.subjectId)!;
    if (subject.levels && !subject.levels.includes(data.grade)) {
      throw new UserFacingError(`${subject.name} ใช้ได้กับ ${subject.levels.map(gradeLabel).join(", ")} เท่านั้น`);
    }
    const sheet = await db.sheet.findUnique({ where: { id }, select: { id: true } });
    if (!sheet) throw new UserFacingError("ไม่พบชีทนี้");
    await db.sheet.update({ where: { id }, data });
    refreshSheets(id);
    return { ok: true, message: "บันทึกรายละเอียดแล้ว" };
  } catch (err) {
    return fail(err);
  }
}

/**
 * Deletes and then redirects to the list on the server: re-rendering the page the
 * admin is on (this sheet's review page) would otherwise turn into a 404 first.
 */
export async function deleteSheet(id: string): Promise<ActionState> {
  try {
    await assertAdmin();
    const sheet = await db.sheet.findUnique({ where: { id: sheetId.parse(id) } });
    if (!sheet) throw new UserFacingError("ไม่พบชีทนี้");
    await db.sheet.delete({ where: { id: sheet.id } });
    await deleteObjects([sheet.pdfKey, ...(sheet.coverKey ? coverFiles(sheet.coverKey) : [])]);
    refreshSheets(sheet.id);
  } catch (err) {
    return fail(err);
  }
  redirect(adminHref("/sheets?status=ALL&deleted=1")); // outside try: redirect() throws by design
}

// ---------------------------------------------------------------------------
// Covers (16:9)
// ---------------------------------------------------------------------------

const MAX_COVER_BYTES = 5 * 1024 * 1024;

function coverFiles(key: string) {
  return [`${key}-1280.webp`, `${key}-640.webp`];
}

async function storeCover(file: FormDataEntryValue | null, ratio?: number) {
  if (!(file instanceof File) || file.size === 0) throw new UserFacingError("กรุณาเลือกไฟล์รูปภาพ");
  if (file.size > MAX_COVER_BYTES) throw new UserFacingError("รูปภาพต้องมีขนาดไม่เกิน 5 MB");
  const { large, small } = await makeCoverImages(new Uint8Array(await file.arrayBuffer()), ratio);
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
  // Landing-page "sheets by grade" tile (4:5)
  z.string().regex(/^grade:[1-6]$/).transform((v) => ({ grade: Number(v.slice(6)) })),
]);

async function currentCoverKey(target: z.output<typeof coverTarget>) {
  if (target === "uniform") return (await db.siteSetting.findUnique({ where: { id: 1 }, select: { uniformCoverKey: true } }))?.uniformCoverKey ?? null;
  if ("subject" in target) return (await db.subject.findUnique({ where: { id: target.subject } }))?.coverKey ?? null;
  if ("grade" in target) return (await db.homeImage.findUnique({ where: { slot: target.grade } }))?.imageKey ?? null;
  return (await db.sheet.findUnique({ where: { id: target.sheet } }))?.coverKey ?? null;
}

async function saveCoverKey(target: z.output<typeof coverTarget>, key: string | null) {
  if (target !== "uniform" && "grade" in target) {
    const slot = target.grade;
    if (key) await db.homeImage.upsert({ where: { slot }, create: { slot, imageKey: key }, update: { imageKey: key } });
    else await db.homeImage.deleteMany({ where: { slot } });
  } else if (target === "uniform") {
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
    const key = reset ? null : await storeCover(formData.get("file"), typeof target === "object" && "grade" in target ? 5 / 4 : undefined);
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
    // News images are portrait 4:5
    const imageKey = hasFile ? await storeCover(file, 5 / 4) : removeImage ? null : (existing?.imageKey ?? null);

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

// ---------------------------------------------------------------------------
// Site videos (news page top, landing page above the footer)
// The browser uploads straight to R2 with a presigned PUT, then we save the key.
// ---------------------------------------------------------------------------

const videoSlot = z.enum(["news", "home"]);
const VIDEO_FIELD = { news: "newsVideoKey", home: "homeVideoKey" } as const;
const VIDEO_KEY_RE = /^videos\/[0-9a-f-]{36}\.(mp4|webm)$/;

const videoUploadInput = z.object({
  slot: videoSlot,
  type: z.enum(Object.keys(VIDEO_TYPES) as [keyof typeof VIDEO_TYPES], { message: "รองรับเฉพาะไฟล์ MP4 หรือ WebM" }),
  size: z.number().int().positive().max(MAX_VIDEO_BYTES, `วิดีโอต้องมีขนาดไม่เกิน ${MAX_VIDEO_BYTES / 1024 / 1024} MB`),
});

export async function requestVideoUpload(
  input: z.input<typeof videoUploadInput>,
): Promise<{ ok: true; key: string; url: string } | { ok: false; message: string }> {
  try {
    await assertAdmin();
    const { type, size } = videoUploadInput.parse(input);
    const key = `videos/${randomUUID()}.${VIDEO_TYPES[type]}`;
    return { ok: true, key, url: await presignPut(key, type, size) };
  } catch (err) {
    return fail(err);
  }
}

/** Point a slot at an uploaded video (key) or remove it (key = null); the old file is deleted. */
export async function saveVideo(slotInput: string, keyInput: string | null): Promise<ActionState> {
  try {
    await assertAdmin();
    const slot = videoSlot.parse(slotInput);
    const key = keyInput === null ? null : z.string().regex(VIDEO_KEY_RE, "ไฟล์ไม่ถูกต้อง").parse(keyInput);
    if (key) {
      const head = await headObject(key);
      if (!head || head.size > MAX_VIDEO_BYTES) throw new UserFacingError("อัปโหลดวิดีโอไม่สำเร็จ กรุณาลองใหม่");
    }
    const field = VIDEO_FIELD[slot];
    const old = (await db.siteSetting.findUnique({ where: { id: 1 }, select: { [field]: true } }))?.[field] ?? null;
    await db.siteSetting.upsert({ where: { id: 1 }, create: { id: 1, [field]: key }, update: { [field]: key } });
    if (old && old !== key) await deleteObjects([old]);

    updateTag(slot === "news" ? TAG_NEWS : TAG_SETTINGS);
    revalidatePath("/admin", "layout");
    return { ok: true, message: key ? "บันทึกวิดีโอแล้ว" : "นำวิดีโอออกแล้ว" };
  } catch (err) {
    return fail(err);
  }
}

// ---------------------------------------------------------------------------
// Admins (super admins = ADMIN_EMAILS add and remove the others)
// ---------------------------------------------------------------------------

export async function addAdmin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSuperAdmin();
    const email = z
      .string()
      .trim()
      .toLowerCase()
      .email("อีเมลไม่ถูกต้อง")
      .refine((e) => e.endsWith(`@${SCHOOL_DOMAIN}`), `ใช้ได้เฉพาะบัญชี @${SCHOOL_DOMAIN}`)
      .parse(formData.get("email"));
    const user = await db.user.findUnique({ where: { email }, select: { id: true, role: true } });
    if (!user) throw new UserFacingError("ยังไม่พบบัญชีนี้ ให้เจ้าของบัญชีเข้าสู่ระบบเว็บนี้ 1 ครั้งก่อน แล้วลองเพิ่มอีกครั้ง");
    if (user.role === "ADMIN") return { ok: true, message: "บัญชีนี้เป็นผู้ดูแลอยู่แล้ว" };
    await db.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "เพิ่มผู้ดูแลแล้ว" };
  } catch (err) {
    return fail(err);
  }
}

export async function removeAdmin(userId: string): Promise<ActionState> {
  try {
    const me = await assertSuperAdmin();
    const user = await db.user.findUnique({ where: { id: z.string().min(1).max(64).parse(userId) }, select: { id: true, email: true } });
    if (!user) throw new UserFacingError("ไม่พบบัญชีนี้");
    if (user.id === me.id || adminEmails().includes(user.email.toLowerCase())) {
      throw new UserFacingError("ผู้ดูแลระบบหลักถอดสิทธิ์ที่นี่ไม่ได้ (แก้ได้ที่ ADMIN_EMAILS)");
    }
    await db.user.update({ where: { id: user.id }, data: { role: "USER" } });
    revalidatePath("/admin", "layout");
    return { ok: true, message: "ถอดสิทธิ์ผู้ดูแลแล้ว" };
  } catch (err) {
    return fail(err);
  }
}
