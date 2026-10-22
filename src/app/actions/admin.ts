"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { adminHref } from "@/lib/urls";
import { z } from "zod";
import { db } from "@/lib/db";
import { deleteObjects, headObject, presignPut, putObject } from "@/lib/r2";
import { makeCoverImages, makeIconImages, makeOgImage, UserFacingError } from "@/lib/pdf";
import { assertAdmin, assertSuperAdmin, AuthError } from "@/lib/session";
import { adminEmails } from "@/lib/env";
import { TAG_ANNOUNCEMENT, TAG_NEWS, TAG_SETTINGS, TAG_SHEETS } from "@/lib/queries";
import { storePageCover } from "@/lib/page-cover";
import { PDFDocument } from "pdf-lib";
import { addWatermark, UNWATERMARKED, WATERMARKED_PREFIX } from "@/lib/watermark";
import { getObjectBytes } from "@/lib/r2";
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
    await deleteObjects([sheet.pdfKey, ...[sheet.coverKey, sheet.pageCoverKey].flatMap((k) => (k ? coverFiles(k) : []))]);
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
  z.enum(SUBJECT_IDS).transform((id) => ({ subject: id })),
  z.string().regex(/^sheet:.+$/).transform((v) => ({ sheet: v.slice(6) })),
  // Landing-page "sheets by grade" tile (4:5)
  z.string().regex(/^grade:[1-6]$/).transform((v) => ({ grade: Number(v.slice(6)) })),
]);

async function currentCoverKey(target: z.output<typeof coverTarget>) {
  if ("subject" in target) return (await db.subject.findUnique({ where: { id: target.subject } }))?.coverKey ?? null;
  if ("grade" in target) return (await db.homeImage.findUnique({ where: { slot: target.grade } }))?.imageKey ?? null;
  return (await db.sheet.findUnique({ where: { id: target.sheet } }))?.coverKey ?? null;
}

async function saveCoverKey(target: z.output<typeof coverTarget>, key: string | null) {
  if ("grade" in target) {
    const slot = target.grade;
    if (key) await db.homeImage.upsert({ where: { slot }, create: { slot, imageKey: key }, update: { imageKey: key } });
    else await db.homeImage.deleteMany({ where: { slot } });
  } else if ("subject" in target) {
    await db.subject.update({ where: { id: target.subject }, data: { coverKey: key } });
  } else {
    await db.sheet.update({ where: { id: target.sheet }, data: { coverKey: key } });
  }
}

/** Upload a new cover (formData: target, file) or reset to default (formData: target, useDefault=1). */
export async function updateCover(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const target = coverTarget.parse(formData.get("target"));
    const old = await currentCoverKey(target);
    const reset = formData.get("useDefault") === "1";
    const key = reset ? null : await storeCover(formData.get("file"), "grade" in target ? 5 / 4 : undefined);
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
    const mode = z.enum(["SUBJECT", "FIRST_PAGE"]).parse(formData.get("mode"));
    await db.siteSetting.upsert({ where: { id: 1 }, create: { id: 1, coverMode: mode }, update: { coverMode: mode } });
    updateTag(TAG_SETTINGS);
    updateTag(TAG_SHEETS);
    revalidatePath("/admin", "layout");
    return { ok: true, message: mode === "FIRST_PAGE" ? "ใช้หน้าแรกของชีทเป็นภาพปกแล้ว" : "ใช้ภาพปกตามวิชาแล้ว" };
  } catch (err) {
    return fail(err);
  }
}

const PAGE_COVER_BATCH = 10; // keeps one click well inside the function time limit

/** Draw first-page covers for sheets uploaded before covers were made at upload time. */
export async function makeMissingPageCovers(): Promise<ActionState> {
  try {
    await assertAdmin();
    const missing = { pageCoverKey: null, NOT: { pdfKey: { startsWith: "demo/" } } };
    const sheets = await db.sheet.findMany({ where: missing, select: { id: true, pdfKey: true }, orderBy: { createdAt: "desc" }, take: PAGE_COVER_BATCH });
    let failed = 0;
    for (const sheet of sheets) {
      const key = await storePageCover(await getObjectBytes(sheet.pdfKey));
      if (key) await db.sheet.update({ where: { id: sheet.id }, data: { pageCoverKey: key } });
      else failed++;
    }
    const left = (await db.sheet.count({ where: missing })) - failed;
    updateTag(TAG_SHEETS);
    revalidatePath("/admin", "layout");
    return {
      ok: failed === 0,
      message: `สร้างภาพแล้ว ${sheets.length - failed} ชีท${failed ? ` · สร้างไม่ได้ ${failed} ชีท` : ""}${left > 0 ? ` · เหลืออีก ${left} ชีท กดอีกครั้ง` : ""}`,
    };
  } catch (err) {
    return fail(err);
  }
}

const WATERMARK_BATCH = 4; // large PDFs: keeps one click well inside the function time limit

/**
 * Add the watermark to older sheets: the new file goes to a new key, then the sheet
 * points at it and the old file is removed, so a failure leaves the sheet as it was.
 */
export async function watermarkOldSheets(): Promise<ActionState> {
  try {
    await assertAdmin();
    const sheets = await db.sheet.findMany({
      where: UNWATERMARKED,
      select: { id: true, pdfKey: true, author: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: WATERMARK_BATCH,
    });
    let failed = 0;
    for (const sheet of sheets) {
      try {
        const doc = await PDFDocument.load(await getObjectBytes(sheet.pdfKey), { updateMetadata: false });
        await addWatermark(doc, sheet.author.name);
        const bytes = await doc.save({ useObjectStreams: true });
        const pdfKey = `${WATERMARKED_PREFIX}${randomUUID()}.pdf`;
        await putObject(pdfKey, bytes, "application/pdf");
        await db.sheet.update({ where: { id: sheet.id }, data: { pdfKey, pdfBytes: bytes.byteLength } });
        await deleteObjects([sheet.pdfKey]);
      } catch (err) {
        console.error("[watermark]", sheet.id, err);
        failed++;
      }
    }
    const left = (await db.sheet.count({ where: UNWATERMARKED })) - failed;
    refreshSheets();
    return {
      ok: failed === 0,
      message: `ใส่ลายน้ำแล้ว ${sheets.length - failed} ชีท${failed ? ` · ใส่ไม่ได้ ${failed} ชีท` : ""}${left > 0 ? ` · เหลืออีก ${left} ชีท กดอีกครั้ง` : ""}`,
    };
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
  // optional: a news card can be just a title (and a picture)
  summary: z.string().trim().max(1000, "รายละเอียดยาวเกิน 1000 ตัวอักษร"),
  linkUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => !v || /^https?:\/\//i.test(v), "ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://")
    .transform((v) => v || null),
  linkLabel: z.string().trim().max(40, "ชื่อปุ่มยาวเกิน 40 ตัวอักษร").transform((v) => v || null),
  category: z.string().trim().max(40).transform((v) => v || null),
  publishedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "วันที่ไม่ถูกต้อง")
    .transform((v) => new Date(`${v}T12:00:00+07:00`)),
});

/** Create (no id) or update a news card. formData: id?, title, summary, linkUrl, linkLabel, publishedAt, file?, removeImage? */
export async function saveNewsPost(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const input = newsInput.parse({
      id: formData.get("id") || undefined,
      title: formData.get("title"),
      summary: formData.get("summary") ?? "",
      linkUrl: formData.get("linkUrl") ?? "",
      linkLabel: formData.get("linkLabel") ?? "",
      category: formData.get("category"),
      publishedAt: formData.get("publishedAt"),
    });
    if (input.category && !(await db.newsCategory.findUnique({ where: { name: input.category } }))) {
      throw new UserFacingError("ไม่พบหมวดหมู่นี้ กรุณาเลือกใหม่");
    }
    const existing = input.id ? await db.newsPost.findUnique({ where: { id: input.id } }) : null;
    if (input.id && !existing) throw new UserFacingError("ไม่พบข่าวนี้");

    const file = formData.get("file");
    const hasFile = file instanceof File && file.size > 0;
    const removeImage = formData.get("removeImage") === "1";
    // News images are portrait 4:5
    const imageKey = hasFile ? await storeCover(file, 5 / 4) : removeImage ? null : (existing?.imageKey ?? null);

    const data = { title: input.title, summary: input.summary, linkUrl: input.linkUrl, linkLabel: input.linkUrl ? input.linkLabel : null, category: input.category, publishedAt: input.publishedAt, imageKey };
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

const videoSlot = z.enum(["news", "home", "homeMobile"]);
const VIDEO_FIELD = { news: "newsVideoKey", home: "homeVideoKey", homeMobile: "homeVideoMobileKey" } as const;
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

// ---------------------------------------------------------------------------
// Landing banners (2000×600 carousel)
// ---------------------------------------------------------------------------

const BANNER_WIDTHS: [number, number] = [2000, 1000];
const bannerFiles = (key: string) => BANNER_WIDTHS.map((w) => `${key}-${w}.webp`);

function refreshBanners() {
  updateTag(TAG_SETTINGS);
  revalidatePath("/admin", "layout");
}

const bannerLink = z
  .string()
  .trim()
  .max(500)
  .refine((v) => !v || /^https?:\/\//i.test(v), "ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://");

/** formData: file, linkUrl (optional). Goes to the end of the carousel. */
export async function addBanner(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const linkUrl = bannerLink.parse(formData.get("linkUrl") ?? "");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new UserFacingError("กรุณาเลือกไฟล์รูปภาพ");
    if (file.size > MAX_COVER_BYTES) throw new UserFacingError("รูปภาพต้องมีขนาดไม่เกิน 5 MB");
    const { large, small } = await makeCoverImages(new Uint8Array(await file.arrayBuffer()), 0.3, BANNER_WIDTHS);
    const key = `covers/${randomUUID()}`;
    const [bigKey, smallKey] = bannerFiles(key);
    const immutable = "public, max-age=31536000, immutable";
    await Promise.all([putObject(bigKey, large, "image/webp", immutable), putObject(smallKey, small, "image/webp", immutable)]);
    const last = await db.banner.aggregate({ _max: { sortOrder: true } });
    await db.banner.create({ data: { imageKey: key, linkUrl: linkUrl || null, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
    refreshBanners();
    return { ok: true, message: "เพิ่มแบนเนอร์แล้ว" };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteBanner(id: string): Promise<ActionState> {
  try {
    await assertAdmin();
    const b = await db.banner.findUnique({ where: { id: z.string().min(1).max(40).parse(id) } });
    if (!b) throw new UserFacingError("ไม่พบแบนเนอร์นี้");
    await db.banner.delete({ where: { id: b.id } });
    await deleteObjects(bannerFiles(b.imageKey));
    refreshBanners();
    return { ok: true, message: "ลบแบนเนอร์แล้ว" };
  } catch (err) {
    return fail(err);
  }
}

/** Swap with the neighbour above (-1) or below (+1). */
export async function moveBanner(id: string, dir: number): Promise<ActionState> {
  try {
    await assertAdmin();
    const all = await db.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
    const i = all.findIndex((b) => b.id === id);
    const j = i + (dir < 0 ? -1 : 1);
    if (i < 0 || j < 0 || j >= all.length) return null;
    [all[i], all[j]] = [all[j], all[i]];
    await db.$transaction(all.map((b, n) => db.banner.update({ where: { id: b.id }, data: { sortOrder: n + 1 } })));
    refreshBanners();
    return null;
  } catch (err) {
    return fail(err);
  }
}

// ---------------------------------------------------------------------------
// Site icon (favicon) and link-preview image
// ---------------------------------------------------------------------------

const iconFiles = (key: string) => [32, 180, 512].map((s) => `${key}-icon-${s}.png`);
const ogFiles = (key: string) => [`${key}-og.jpg`];

/** formData: siteName (blank = the built-in name). The browser-tab title of the home page. */
export async function setSiteName(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const siteName = z.string().trim().max(80, "ชื่อเว็บยาวเกิน 80 ตัวอักษร").parse(formData.get("siteName") ?? "") || null;
    await db.siteSetting.upsert({ where: { id: 1 }, create: { id: 1, siteName }, update: { siteName } });
    updateTag(TAG_SETTINGS);
    revalidatePath("/", "layout");
    return { ok: true, message: siteName ? "บันทึกชื่อเว็บแล้ว" : "กลับไปใช้ชื่อเริ่มต้นแล้ว" };
  } catch (err) {
    return fail(err);
  }
}

/** formData: kind ("favicon" | "og"), file — or useDefault=1 to go back to the built-in one. */
export async function setSiteImage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const kind = z.enum(["favicon", "og"]).parse(formData.get("kind"));
    const field = kind === "favicon" ? "faviconKey" : "ogImageKey";
    const old = (await db.siteSetting.findUnique({ where: { id: 1 }, select: { [field]: true } }))?.[field] ?? null;
    let key: string | null = null;
    if (formData.get("useDefault") !== "1") {
      const file = formData.get("file");
      if (!(file instanceof File) || file.size === 0) throw new UserFacingError("กรุณาเลือกไฟล์รูปภาพ");
      if (file.size > MAX_COVER_BYTES) throw new UserFacingError("รูปภาพต้องมีขนาดไม่เกิน 5 MB");
      const bytes = new Uint8Array(await file.arrayBuffer());
      key = `covers/${randomUUID()}`;
      const immutable = "public, max-age=31536000, immutable";
      if (kind === "favicon") {
        const { s32, s180, s512 } = await makeIconImages(bytes);
        const [a, b, c] = iconFiles(key);
        await Promise.all([putObject(a, s32, "image/png", immutable), putObject(b, s180, "image/png", immutable), putObject(c, s512, "image/png", immutable)]);
      } else {
        await putObject(ogFiles(key)[0], await makeOgImage(bytes), "image/jpeg", immutable);
      }
    }
    await db.siteSetting.upsert({ where: { id: 1 }, create: { id: 1, [field]: key }, update: { [field]: key } });
    if (old) await deleteObjects(kind === "favicon" ? iconFiles(old) : ogFiles(old));
    updateTag(TAG_SETTINGS);
    revalidatePath("/", "layout");
    return { ok: true, message: key ? "บันทึกแล้ว" : "กลับไปใช้ค่าเริ่มต้นแล้ว" };
  } catch (err) {
    return fail(err);
  }
}

// ---------------------------------------------------------------------------
// News categories (admins add, rename and delete them)
// ---------------------------------------------------------------------------

const categoryName = z.string().trim().min(1, "กรุณากรอกชื่อหมวดหมู่").max(40, "ชื่อหมวดหมู่ยาวเกิน 40 ตัวอักษร");

export async function addNewsCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const name = categoryName.parse(formData.get("name"));
    if (await db.newsCategory.findUnique({ where: { name } })) throw new UserFacingError("มีหมวดหมู่นี้แล้ว");
    const last = await db.newsCategory.aggregate({ _max: { sortOrder: true } });
    await db.newsCategory.create({ data: { name, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
    refreshNews();
    return { ok: true, message: `เพิ่มหมวดหมู่ "${name}" แล้ว` };
  } catch (err) {
    return fail(err);
  }
}

/** Renames the category and every news card that uses it. */
export async function renameNewsCategory(id: string, nameInput: string): Promise<ActionState> {
  try {
    await assertAdmin();
    const name = categoryName.parse(nameInput);
    const cat = await db.newsCategory.findUnique({ where: { id: z.string().min(1).max(40).parse(id) } });
    if (!cat) throw new UserFacingError("ไม่พบหมวดหมู่นี้");
    if (cat.name === name) return null;
    if (await db.newsCategory.findUnique({ where: { name } })) throw new UserFacingError("มีหมวดหมู่นี้แล้ว");
    await db.$transaction([
      db.newsCategory.update({ where: { id: cat.id }, data: { name } }),
      db.newsPost.updateMany({ where: { category: cat.name }, data: { category: name } }),
    ]);
    refreshNews();
    return { ok: true, message: "เปลี่ยนชื่อแล้ว" };
  } catch (err) {
    return fail(err);
  }
}

/** Deletes the category; its news cards stay, without a category. */
export async function deleteNewsCategory(id: string): Promise<ActionState> {
  try {
    await assertAdmin();
    const cat = await db.newsCategory.findUnique({ where: { id: z.string().min(1).max(40).parse(id) } });
    if (!cat) throw new UserFacingError("ไม่พบหมวดหมู่นี้");
    await db.$transaction([
      db.newsPost.updateMany({ where: { category: cat.name }, data: { category: null } }),
      db.newsCategory.delete({ where: { id: cat.id } }),
    ]);
    refreshNews();
    return { ok: true, message: "ลบหมวดหมู่แล้ว" };
  } catch (err) {
    return fail(err);
  }
}

// ---------------------------------------------------------------------------
// Pop-up announcements: to everyone or chosen users, from startsAt until endsAt or until stopped;
// each browser sees each one once
// ---------------------------------------------------------------------------

function refreshAnnouncements() {
  updateTag(TAG_ANNOUNCEMENT);
  revalidatePath("/admin", "layout");
}

const announcementInput = z.object({
  title: z.string().trim().min(1, "กรุณากรอกหัวข้อ").max(100, "หัวข้อยาวเกิน 100 ตัวอักษร"),
  body: z.string().trim().max(1000, "ข้อความยาวเกิน 1000 ตัวอักษร"),
  linkUrl: newsInput.shape.linkUrl,
  linkLabel: newsInput.shape.linkLabel,
});

/** `<input type="datetime-local">` value, read as Thai time ("2026-11-01T08:00" → Date); blank → null */
function thaiDateTime(v: FormDataEntryValue | null) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) throw new UserFacingError("วันเวลาไม่ถูกต้อง");
  return new Date(`${s}:00+07:00`);
}

/**
 * formData: title, body, linkUrl, linkLabel, audience ("all" | "users"), emails (one per line
 * or comma-separated, for "users"), startsAt / endsAt (datetime-local, optional).
 */
export async function sendAnnouncement(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertAdmin();
    const input = announcementInput.parse({
      title: formData.get("title"),
      body: formData.get("body") ?? "",
      linkUrl: formData.get("linkUrl") ?? "",
      linkLabel: formData.get("linkLabel") ?? "",
    });

    let userIds: string[] = [];
    if (formData.get("audience") === "users") {
      const emails = [...new Set(String(formData.get("emails") ?? "").toLowerCase().split(/[\s,;]+/).filter(Boolean))];
      if (emails.length === 0) throw new UserFacingError("กรุณาใส่อีเมลผู้รับอย่างน้อย 1 คน");
      if (emails.length > 500) throw new UserFacingError("ส่งแบบเลือกคนได้ครั้งละไม่เกิน 500 คน");
      const users = await db.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } });
      const missing = emails.filter((e) => !users.some((u) => u.email.toLowerCase() === e));
      if (missing.length) {
        throw new UserFacingError(`ไม่พบผู้ใช้ ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ` และอีก ${missing.length - 3} คน` : ""}`);
      }
      userIds = users.map((u) => u.id);
    }

    const startsAt = thaiDateTime(formData.get("startsAt")) ?? new Date();
    const endsAt = thaiDateTime(formData.get("endsAt"));
    if (endsAt && endsAt <= startsAt) throw new UserFacingError("เวลาสิ้นสุดต้องหลังเวลาเริ่มแสดง");
    if (endsAt && endsAt <= new Date()) throw new UserFacingError("เวลาสิ้นสุดผ่านไปแล้ว");

    await db.announcement.create({
      data: { ...input, linkLabel: input.linkUrl ? input.linkLabel : null, userIds, startsAt, endsAt },
    });
    refreshAnnouncements();
    const who = userIds.length ? `ผู้ใช้ ${userIds.length} คน` : "ทุกคน";
    const when = startsAt > new Date() ? "จะเริ่มแสดงตามเวลาที่ตั้งไว้" : "จะเห็นเมื่อเปิดเว็บครั้งถัดไป";
    return { ok: true, message: `ส่งประกาศถึง${who}แล้ว ${when}` };
  } catch (err) {
    return fail(err);
  }
}

export async function setAnnouncementActive(id: string, active: boolean): Promise<ActionState> {
  try {
    await assertAdmin();
    await db.announcement.update({ where: { id: z.string().min(1).max(40).parse(id) }, data: { active } });
    refreshAnnouncements();
    return { ok: true, message: active ? "แสดงประกาศอีกครั้งแล้ว" : "หยุดแสดงประกาศแล้ว" };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteAnnouncement(id: string): Promise<ActionState> {
  try {
    await assertAdmin();
    await db.announcement.delete({ where: { id: z.string().min(1).max(40).parse(id) } });
    refreshAnnouncements();
    return { ok: true, message: "ลบประกาศแล้ว" };
  } catch (err) {
    return fail(err);
  }
}
