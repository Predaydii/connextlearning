import "server-only";
import { db } from "@/lib/db";
import { adminEmails } from "@/lib/env";
import { GRADE_VALUES, gradeLabel } from "@/lib/constants";
import type { Grade, Prisma } from "@/generated/prisma/client";
import { readContacts } from "@/lib/contacts";
import type { ProfileValues } from "@/components/profile-form";

/** Admin "ผู้ใช้งาน" page and its CSV export: who signed up, what they registered as, and when they were last here. */

export const MEMBER_TYPES = [
  { value: "STUDENT", label: "นักเรียน" },
  { value: "TEACHER", label: "ครู" },
  { value: "ALUMNI", label: "ศิษย์เก่า" },
  { value: "NONE", label: "ยังไม่ลงทะเบียน" },
] as const;
export type MemberTypeFilter = (typeof MEMBER_TYPES)[number]["value"];

export type MemberFilters = { q: string; type: MemberTypeFilter | ""; grade: Grade | "" };

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseMemberFilters(sp: Params): MemberFilters {
  const type = one(sp.type);
  const grade = one(sp.grade);
  return {
    q: one(sp.q).trim().slice(0, 100),
    type: MEMBER_TYPES.some((t) => t.value === type) ? (type as MemberTypeFilter) : "",
    grade: (GRADE_VALUES as string[]).includes(grade) ? (grade as Grade) : "",
  };
}

export function memberWhere(f: MemberFilters): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = [];
  if (f.q) {
    and.push({
      OR: [
        { name: { contains: f.q, mode: "insensitive" } },
        { firstName: { contains: f.q, mode: "insensitive" } },
        { lastName: { contains: f.q, mode: "insensitive" } },
        { email: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }
  if (f.type === "NONE") and.push({ registeredAt: null });
  else if (f.type) and.push({ memberType: f.type, registeredAt: { not: null } });
  // A grade means: students in it, or teachers who teach it
  if (f.grade) and.push({ OR: [{ grade: f.grade }, { teachGrades: { has: f.grade } }] });
  return { AND: and };
}

export const memberSelect = {
  id: true,
  name: true,
  email: true,
  image: true,
  role: true,
  createdAt: true,
  registeredAt: true,
  prefix: true,
  firstName: true,
  lastName: true,
  memberType: true,
  grade: true,
  room: true,
  studentNo: true,
  birthDate: true,
  gradYear: true,
  department: true,
  teachGrades: true,
  // Sessions refresh once a day while someone uses the site, so this is "last seen" to the day
  sessions: { orderBy: { updatedAt: "desc" }, take: 1, select: { updatedAt: true } },
  _count: { select: { sheets: true } },
} satisfies Prisma.UserSelect;

export type Member = Prisma.UserGetPayload<{ select: typeof memberSelect }>;

export function memberName(m: Member) {
  return m.firstName ? `${m.prefix ?? ""}${m.firstName} ${m.lastName ?? ""}`.trim() : m.name;
}

/** "นักเรียน ม.5/1 เลขที่ 12" · "ครู คณิตศาสตร์ (ม.4, ม.5)" · "ศิษย์เก่า จบปี 2565" · "ยังไม่ลงทะเบียน" */
export function memberDetail(m: Member) {
  if (!m.registeredAt) return "ยังไม่ลงทะเบียน";
  if (m.memberType === "STUDENT") return `นักเรียน ${m.grade ? gradeLabel(m.grade) : ""}${m.room ? `/${m.room}` : ""}${m.studentNo ? ` เลขที่ ${m.studentNo}` : ""}`;
  if (m.memberType === "TEACHER") return `ครู ${m.department ?? ""}${m.teachGrades.length ? ` (${m.teachGrades.map(gradeLabel).join(", ")})` : ""}`;
  if (m.memberType === "ALUMNI") return `ศิษย์เก่า${m.gradYear ? ` จบปี ${m.gradYear}` : ""}`;
  return "";
}

export function memberRole(m: Member) {
  if (adminEmails().includes(m.email.toLowerCase())) return "ผู้ดูแลระบบหลัก";
  return m.role === "ADMIN" ? "ผู้ดูแลรอง" : "";
}

export function lastSeen(m: Member) {
  return m.sessions[0]?.updatedAt ?? null;
}

export async function memberCounts() {
  const [total, byType, unregistered, activeWeek] = await Promise.all([
    db.user.count(),
    db.user.groupBy({ by: ["memberType"], where: { registeredAt: { not: null } }, _count: { _all: true } }),
    db.user.count({ where: { registeredAt: null } }),
    db.user.count({ where: { sessions: { some: { updatedAt: { gte: new Date(Date.now() - 7 * 86_400_000) } } } } }),
  ]);
  const of = (t: string) => byType.find((r) => r.memberType === t)?._count._all ?? 0;
  return { total, students: of("STUDENT"), teachers: of("TEACHER"), alumni: of("ALUMNI"), unregistered, activeWeek };
}

/** Saved registration → the values the profile form starts from (birth date shown in พ.ศ.). */
export const profileSelect = {
  prefix: true, firstName: true, lastName: true, memberType: true,
  grade: true, room: true, studentNo: true, birthDate: true, gradYear: true, department: true, teachGrades: true, contacts: true,
} satisfies Prisma.UserSelect;

export function toProfileValues(u: Prisma.UserGetPayload<{ select: typeof profileSelect }>): ProfileValues {
  return {
    prefix: u.prefix ?? undefined,
    firstName: u.firstName ?? "",
    lastName: u.lastName ?? "",
    memberType: u.memberType ?? undefined,
    grade: u.grade ?? undefined,
    room: u.room ?? undefined,
    studentNo: u.studentNo ?? undefined,
    // birthDate is a DATE column (UTC midnight)
    birthDay: u.birthDate?.getUTCDate(),
    birthMonth: u.birthDate ? u.birthDate.getUTCMonth() + 1 : undefined,
    birthYear: u.birthDate ? u.birthDate.getUTCFullYear() + 543 : undefined,
    gradYear: u.gradYear ?? undefined,
    department: u.department ?? undefined,
    teachGrades: u.teachGrades,
    contacts: readContacts(u.contacts),
  };
}
