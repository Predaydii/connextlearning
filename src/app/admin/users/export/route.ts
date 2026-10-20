import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/session";
import { gradeLabel } from "@/lib/constants";
import { lastSeen, memberRole, memberSelect, memberWhere, parseMemberFilters } from "@/lib/members";

const TYPE = { STUDENT: "นักเรียน", TEACHER: "ครู", ALUMNI: "ศิษย์เก่า" } as const;
const bkk = (d: Date | null) => (d ? d.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }) : "");

/** One cell: quoted, and never starting with = + - @ (spreadsheet formula injection). */
function cell(v: string | number | null | undefined) {
  const s = String(v ?? "");
  return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
}

/** Admin "ผู้ใช้งาน" list as CSV (same filters as the page). Contains personal data: admins only, never cached. */
export async function GET(req: Request) {
  try {
    await assertAdmin();
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
  const f = parseMemberFilters(Object.fromEntries(new URL(req.url).searchParams));
  const rows = await db.user.findMany({ where: memberWhere(f), orderBy: { createdAt: "desc" }, select: memberSelect, take: 10_000 });

  const head = ["อีเมล", "คำนำหน้า", "ชื่อ", "นามสกุล", "ชื่อที่แสดง", "สถานะ", "ชั้น", "ห้อง", "เลขที่", "กลุ่มสาระ", "ชั้นที่สอน", "วันเกิด (พ.ศ.)", "ปีที่จบ", "บทบาท", "จำนวนชีท", "สมัครเมื่อ", "ลงทะเบียนเมื่อ", "ใช้งานล่าสุด"];
  const lines = rows.map((m) => {
    const birth = m.birthDate
      ? `${m.birthDate.getUTCDate()}/${m.birthDate.getUTCMonth() + 1}/${m.birthDate.getUTCFullYear() + 543}`
      : "";
    return [
      m.email, m.prefix, m.firstName, m.lastName, m.name,
      m.registeredAt && m.memberType ? TYPE[m.memberType] : "ยังไม่ลงทะเบียน",
      m.grade ? gradeLabel(m.grade) : "", m.room, m.studentNo, m.department,
      m.teachGrades.map(gradeLabel).join(" "), birth, m.gradYear, memberRole(m), m._count.sheets,
      bkk(m.createdAt), bkk(m.registeredAt), bkk(lastSeen(m)),
    ].map(cell).join(",");
  });
  // BOM so Excel opens the Thai text as UTF-8
  const csv = "﻿" + [head.map(cell).join(","), ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="connext-users-${bkk(new Date())}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
