"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { currentBuddhistYear, DEPARTMENTS, GRADE_VALUES, MAX_ROOMS, MAX_STUDENT_NO, NAME_PREFIXES } from "@/lib/constants";
import { TAG_SHEETS } from "@/lib/queries";
import { CONTACTS, type Contacts } from "@/lib/contacts";
import { assertAdmin, assertSignedIn, AuthError } from "@/lib/session";

export type RegisterState = { ok: false; message: string } | null;

const name = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `กรุณากรอก${label}`)
    .max(60, `${label}ยาวเกินไป`)
    .regex(/^[\p{L}\p{M}\s.'-]+$/u, `${label}ใช้ได้เฉพาะตัวอักษร`);

const int = (msg: string) => z.coerce.number({ message: msg }).int(msg);

const base = z.object({
  prefix: z.enum(NAME_PREFIXES, { message: "กรุณาเลือกคำนำหน้า" }),
  firstName: name("ชื่อ"),
  lastName: name("นามสกุล"),
});

const student = base.extend({
  memberType: z.literal("STUDENT"),
  grade: z.enum(GRADE_VALUES, { message: "กรุณาเลือกชั้น" }),
  room: int("กรุณาเลือกห้อง").min(1, "กรุณาเลือกห้อง").max(MAX_ROOMS, "ห้องไม่ถูกต้อง"),
  studentNo: int("กรุณากรอกเลขที่").min(1, "เลขที่ไม่ถูกต้อง").max(MAX_STUDENT_NO, "เลขที่ไม่ถูกต้อง"),
});

const alumni = base.extend({
  memberType: z.literal("ALUMNI"),
  birthDay: int("กรุณาเลือกวันเกิด").min(1, "วันเกิดไม่ถูกต้อง").max(31, "วันเกิดไม่ถูกต้อง"),
  birthMonth: int("กรุณาเลือกเดือนเกิด").min(1, "เดือนเกิดไม่ถูกต้อง").max(12, "เดือนเกิดไม่ถูกต้อง"),
  birthYear: int("กรุณาเลือกปีเกิด"), // พ.ศ.
  gradYear: int("กรุณาเลือกปีการศึกษาที่จบ"), // พ.ศ.
});

const teacher = base.extend({
  memberType: z.literal("TEACHER"),
  department: z.enum(DEPARTMENTS, { message: "กรุณาเลือกกลุ่มสาระการเรียนรู้" }),
  teachGrades: z.array(z.enum(GRADE_VALUES)).min(1, "กรุณาเลือกระดับชั้นที่สอนอย่างน้อย 1 ชั้น"),
});

const input = z.discriminatedUnion("memberType", [student, alumni, teacher], { message: "กรุณาเลือกสถานะ" });

/** Redirect target after registering: same-site paths only. */
function safeNext(v: FormDataEntryValue | null) {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") && !s.startsWith("/register") ? s : "/sheets";
}

/** Validated form → the user fields to save. Shared by the user (register / profile) and admins. */
function memberUpdate(formData: FormData) {
  // getAll: the teacher's grade checkboxes share one name
  const data = input.parse({ ...Object.fromEntries(formData), teachGrades: formData.getAll("teachGrades") });
  const thisYear = currentBuddhistYear();

  // Optional contact links: blank = not shown; anything else must be valid
  const contacts: Contacts = {};
  for (const c of CONTACTS) {
    const raw = String(formData.get(`contact_${c.key}`) ?? "").trim().slice(0, 600); // Facebook search links for Thai names run long
    if (!raw) continue;
    const v = c.clean(raw);
    if (!v) throw new AuthError(`${c.label} ไม่ถูกต้อง`);
    contacts[c.key] = v;
  }

  const none = { grade: null, room: null, studentNo: null, birthDate: null, gradYear: null, department: null, teachGrades: [] };
  let details;
  if (data.memberType === "TEACHER") {
    details = { ...none, department: data.department, teachGrades: [...new Set(data.teachGrades)] };
  } else if (data.memberType === "STUDENT") {
    details = { ...none, grade: data.grade, room: data.room, studentNo: data.studentNo };
  } else {
    if (data.birthYear < thisYear - 100 || data.birthYear > thisYear - 10) throw new AuthError("ปีเกิดไม่ถูกต้อง");
    if (data.gradYear < data.birthYear + 12 || data.gradYear > thisYear) throw new AuthError("ปีการศึกษาที่จบไม่ถูกต้อง");
    const birthDate = new Date(Date.UTC(data.birthYear - 543, data.birthMonth - 1, data.birthDay));
    if (birthDate.getUTCDate() !== data.birthDay) throw new AuthError("วันเกิดไม่ถูกต้อง");
    details = { ...none, birthDate, gradYear: data.gradYear };
  }

  return {
    prefix: data.prefix,
    firstName: data.firstName,
    lastName: data.lastName,
    // Public display name (no prefix): shown on shared sheets
    name: `${data.firstName} ${data.lastName}`,
    memberType: data.memberType,
    ...details,
    contacts,
  };
}

function failed(err: unknown, where: string): RegisterState {
  if (err instanceof AuthError) return { ok: false, message: err.message };
  if (err instanceof z.ZodError) return { ok: false, message: err.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  console.error(`[${where}]`, err);
  return { ok: false, message: "เกิดข้อผิดพลาดของระบบ กรุณาลองใหม่อีกครั้ง" };
}

/** First registration and later profile edits (/profile). */
export async function register(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  let next: string;
  let first: boolean;
  try {
    const user = await assertSignedIn();
    first = !user.registered;
    // The form asks in a popup; checked here too so no one is registered without it
    if (first && formData.get("consent") !== "1") throw new AuthError("กรุณายินยอมนโยบายความเป็นส่วนตัวก่อนลงทะเบียน");
    const data = memberUpdate(formData);
    next = safeNext(formData.get("next"));
    await db.user.update({
      where: { id: user.id },
      // Kept from the first registration when editing the profile
      data: { ...data, ...(user.registered ? {} : { registeredAt: new Date() }) },
    });
    // The public name appears on cached sheet lists and the contributor rows
    updateTag(TAG_SHEETS);
  } catch (err) {
    return failed(err, "register");
  }
  // First registration: a "done" screen, then on to `next`
  redirect(first ? `/register/done?next=${encodeURIComponent(next)}` : next);
}

/** Admins correcting someone else's registration (/admin/users/[id]). formData: userId + the profile form. */
export async function adminUpdateMember(_prev: RegisterState, formData: FormData): Promise<RegisterState> {
  let id: string;
  try {
    await assertAdmin();
    id = z.string().min(1).max(64).parse(formData.get("userId"));
    const target = await db.user.findUnique({ where: { id }, select: { registeredAt: true } });
    if (!target) throw new AuthError("ไม่พบผู้ใช้นี้");
    const data = memberUpdate(formData);
    await db.user.update({ where: { id }, data: { ...data, ...(target.registeredAt ? {} : { registeredAt: new Date() }) } });
    updateTag(TAG_SHEETS);
  } catch (err) {
    return failed(err, "admin-member");
  }
  redirect(`/admin/users/${encodeURIComponent(id)}?saved=1`);
}
