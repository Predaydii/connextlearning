"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { deleteObjects, getObjectBytes, headObject, presignPut, putObject } from "@/lib/r2";
import { uploadPdfToDrive } from "@/lib/drive";
import { mergeToPdf, sniffKind, UserFacingError, type FileKind } from "@/lib/pdf";
import { assertUser, AuthError } from "@/lib/session";
import {
  ACADEMIC_YEARS,
  ACCEPTED_TYPES,
  DESCRIPTION_MAX,
  GRADE_VALUES,
  gradeLabel,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_TOTAL_BYTES,
  SEMESTERS,
  SUBJECTS,
  SUBJECT_IDS,
  TITLE_MAX,
  UPLOADS_PER_DAY,
} from "@/lib/constants";

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof UserFacingError || err instanceof AuthError) return { ok: false, error: err.message };
  if (err instanceof z.ZodError) return { ok: false, error: err.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  console.error("[upload]", err);
  return { ok: false, error: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function assertQuota(userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const count = await db.sheet.count({ where: { authorId: userId, createdAt: { gte: since } } });
  if (count >= UPLOADS_PER_DAY) {
    throw new UserFacingError(`อัปโหลดได้ไม่เกิน ${UPLOADS_PER_DAY} ชีทต่อวัน กรุณาลองใหม่พรุ่งนี้`);
  }
}

// ---------------------------------------------------------------------------
// Step 1 – presigned URLs so the browser uploads straight to R2
// ---------------------------------------------------------------------------

const fileSpec = z.object({
  name: z.string().max(255),
  type: z.enum(Object.keys(ACCEPTED_TYPES) as [keyof typeof ACCEPTED_TYPES]),
  size: z.number().int().positive().max(MAX_FILE_BYTES, `ไฟล์ต้องมีขนาดไม่เกิน ${MAX_FILE_BYTES / 1024 / 1024} MB`),
});

const presignInput = z
  .array(fileSpec)
  .min(1, "กรุณาเลือกไฟล์อย่างน้อย 1 ไฟล์")
  .max(MAX_FILES, `อัปโหลดได้สูงสุด ${MAX_FILES} ไฟล์`)
  .refine((files) => files.reduce((s, f) => s + f.size, 0) <= MAX_TOTAL_BYTES, {
    message: `ขนาดไฟล์รวมต้องไม่เกิน ${MAX_TOTAL_BYTES / 1024 / 1024} MB`,
  });

export async function requestUploadUrls(
  files: z.input<typeof presignInput>,
): Promise<Result<{ uploads: { key: string; url: string }[] }>> {
  try {
    const user = await assertUser();
    const parsed = presignInput.parse(files);
    await assertQuota(user.id);
    const uploads = await Promise.all(
      parsed.map(async (f) => {
        const key = `uploads/${user.id}/${randomUUID()}.${ACCEPTED_TYPES[f.type]}`;
        return { key, url: await presignPut(key, f.type, f.size) };
      }),
    );
    return { ok: true, uploads };
  } catch (err) {
    return fail(err);
  }
}

// ---------------------------------------------------------------------------
// Step 2 – merge into one PDF, store, push to Google Drive, queue for review
// ---------------------------------------------------------------------------

const submitInput = z.object({
  keys: z.array(z.string()).min(1, "กรุณาอัปโหลดไฟล์").max(MAX_FILES),
  title: z.string().trim().min(3, "ชื่อชีทต้องมีอย่างน้อย 3 ตัวอักษร").max(TITLE_MAX, `ชื่อชีทยาวได้ไม่เกิน ${TITLE_MAX} ตัวอักษร`),
  description: z
    .string()
    .trim()
    .min(10, "คำอธิบายต้องมีอย่างน้อย 10 ตัวอักษร")
    .max(DESCRIPTION_MAX, `คำอธิบายยาวได้ไม่เกิน ${DESCRIPTION_MAX} ตัวอักษร`),
  subjectId: z.enum(SUBJECT_IDS, { message: "กรุณาเลือกวิชา" }),
  grade: z.enum(GRADE_VALUES, { message: "กรุณาเลือกระดับชั้น" }),
  semester: z.coerce.number().refine((n) => (SEMESTERS as readonly number[]).includes(n), "กรุณาเลือกภาคเรียน"),
  academicYear: z.coerce.number().refine((n) => (ACADEMIC_YEARS as readonly number[]).includes(n), "กรุณาเลือกปีการศึกษา"),
});

export type SubmitSheetInput = z.input<typeof submitInput>;

export async function submitSheet(input: SubmitSheetInput): Promise<Result<{ id: string }>> {
  let keys: string[] = [];
  try {
    const user = await assertUser();
    const data = submitInput.parse(input);
    const requested = [...new Set(data.keys)];

    // Only files this user uploaded through step 1
    const keyRe = new RegExp(`^uploads/${escapeRe(user.id)}/[0-9a-f-]{36}\\.(pdf|png|jpg)$`);
    if (!requested.every((k) => keyRe.test(k))) throw new UserFacingError("ไฟล์ไม่ถูกต้อง กรุณาอัปโหลดใหม่");
    keys = requested; // from here on they are safe to clean up

    const subject = SUBJECTS.find((s) => s.id === data.subjectId)!;
    if (subject.levels && !subject.levels.includes(data.grade)) {
      throw new UserFacingError(`${subject.name} ใช้ได้กับ ${subject.levels.map(gradeLabel).join(", ")} เท่านั้น`);
    }
    await assertQuota(user.id);

    // Verify sizes before downloading anything
    const heads = await Promise.all(keys.map(headObject));
    if (heads.some((h) => !h)) throw new UserFacingError("อัปโหลดไฟล์ไม่สำเร็จบางไฟล์ กรุณาลองใหม่");
    const total = heads.reduce((s, h) => s + h!.size, 0);
    if (heads.some((h) => h!.size > MAX_FILE_BYTES) || total > MAX_TOTAL_BYTES) {
      throw new UserFacingError("ขนาดไฟล์เกินกำหนด");
    }

    const files: { bytes: Uint8Array; kind: FileKind }[] = [];
    for (const key of keys) {
      const bytes = await getObjectBytes(key);
      const kind = sniffKind(bytes);
      const declared = key.endsWith(".pdf") ? "pdf" : "image";
      if (!kind || (declared === "pdf") !== (kind === "pdf")) {
        throw new UserFacingError("พบไฟล์ที่ไม่ใช่ PDF / PNG / JPG จริง กรุณาตรวจสอบไฟล์");
      }
      files.push({ bytes, kind });
    }

    const { bytes, pageCount } = await mergeToPdf(files, {
      title: data.title,
      author: user.name,
      subject: subject.name,
    });

    const pdfKey = `sheets/${randomUUID()}.pdf`;
    await putObject(pdfKey, bytes, "application/pdf");

    // Upload to Drive now (kept private until an admin approves). If Drive is
    // unavailable the sheet is still queued; approval retries the upload.
    let driveFileId: string | null = null;
    try {
      const name = `[${subject.name}] ${gradeLabel(data.grade)} เทอม ${data.semester}-${data.academicYear} - ${data.title}.pdf`;
      driveFileId = await uploadPdfToDrive(name, bytes, data.description);
    } catch (err) {
      console.error("[upload] Google Drive upload failed, will retry on approval", err);
    }

    const sheet = await db.sheet.create({
      data: {
        title: data.title,
        description: data.description,
        subjectId: data.subjectId,
        grade: data.grade,
        semester: data.semester,
        academicYear: data.academicYear,
        pdfKey,
        pdfBytes: bytes.byteLength,
        pageCount,
        driveFileId,
        authorId: user.id,
      },
      select: { id: true },
    });

    revalidatePath("/my-sheets");
    return { ok: true, id: sheet.id };
  } catch (err) {
    return fail(err);
  } finally {
    // Source files are no longer needed (an R2 lifecycle rule on `uploads/` is the safety net)
    if (keys.length) await deleteObjects(keys).catch(() => {});
  }
}
