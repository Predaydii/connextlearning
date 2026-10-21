import Link from "next/link";
import Form from "next/form";
import { Avatar } from "@/components/avatar";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/session";
import { GRADES } from "@/lib/constants";
import { formatNumber, formatThaiDate } from "@/lib/format";
import { adminHref } from "@/lib/urls";
import {
  lastSeen,
  memberCounts,
  memberDetail,
  memberName,
  memberRole,
  memberSelect,
  memberWhere,
  MEMBER_TYPES,
  parseMemberFilters,
} from "@/lib/members";

export const metadata = { title: "ผู้ใช้งาน" };

const PER_PAGE = 50;

export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  await requireAdminPage("/users");
  const sp = await props.searchParams;
  const f = parseMemberFilters(sp);
  const page = Math.max(1, Number(sp.page) || 1);
  const where = memberWhere(f);

  const [rows, total, counts] = await Promise.all([
    db.user.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PER_PAGE, take: PER_PAGE, select: memberSelect }),
    db.user.count({ where }),
    memberCounts(),
  ]);
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const query = (patch: Record<string, string | number>) => {
    const p = new URLSearchParams({ ...(f.q && { q: f.q }), ...(f.type && { type: f.type }), ...(f.grade && { grade: f.grade }) });
    for (const [k, v] of Object.entries(patch)) p.set(k, String(v));
    if (p.get("page") === "1") p.delete("page");
    return p.toString();
  };

  const tiles = [
    { label: "ผู้ใช้ทั้งหมด", value: counts.total },
    { label: "ใช้งานใน 7 วัน", value: counts.activeWeek },
    { label: "นักเรียน", value: counts.students, type: "STUDENT" },
    { label: "ครู", value: counts.teachers, type: "TEACHER" },
    { label: "ศิษย์เก่า", value: counts.alumni, type: "ALUMNI" },
    { label: "ยังไม่ลงทะเบียน", value: counts.unregistered, type: "NONE" },
  ];

  return (
    <div className="grid gap-5">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((t) => {
          const body = (
            <>
              <dt className="text-xs">{t.label}</dt>
              <dd className="mt-0.5 text-2xl font-semibold text-ink">{formatNumber(t.value)}</dd>
            </>
          );
          return t.type ? (
            <Link key={t.label} href={adminHref(`/users?type=${t.type}`)} className={`card block p-4 transition hover:shadow-brand ${f.type === t.type ? "ring-2 ring-primary" : ""}`}>
              {body}
            </Link>
          ) : (
            <div key={t.label} className="card p-4">{body}</div>
          );
        })}
      </dl>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <Form action={adminHref("/users")} className="flex flex-wrap gap-2">
          <input name="q" defaultValue={f.q} placeholder="ค้นหาชื่อ / อีเมล" aria-label="ค้นหา" className="field w-full py-2 text-sm sm:w-56" />
          <select name="type" defaultValue={f.type} aria-label="สถานะ" className="field w-auto py-2 text-sm">
            <option value="">ทุกสถานะ</option>
            {MEMBER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select name="grade" defaultValue={f.grade} aria-label="ระดับชั้น" className="field w-auto py-2 text-sm">
            <option value="">ทุกชั้น</option>
            {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
          <button className="btn-primary btn-sm">กรอง</button>
          {(f.q || f.type || f.grade) && <Link href={adminHref("/users")} className="btn-outline btn-sm">ล้าง</Link>}
        </Form>
        {/* Plain <a>: a file download, not a page */}
        <a href={`${adminHref("/users/export")}?${query({})}`} className="btn-outline btn-sm">ดาวน์โหลด CSV ({formatNumber(total)})</a>
      </div>

      <div className="card relative min-w-0 overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-line bg-primary-50/60 text-xs text-body">
            <tr>
              <th className="px-4 py-3 font-medium">ผู้ใช้</th>
              <th className="px-4 py-3 font-medium">สถานะ / ชั้น</th>
              <th className="px-4 py-3 text-right font-medium">ชีท</th>
              <th className="px-4 py-3 font-medium">สมัครเมื่อ</th>
              <th className="px-4 py-3 font-medium">ใช้งานล่าสุด</th>
              <th className="px-4 py-3"><span className="sr-only">แก้ไข</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && <tr><td colSpan={6} className="px-4 py-16 text-center">ไม่พบผู้ใช้</td></tr>}
            {rows.map((m) => {
              const role = memberRole(m);
              const seen = lastSeen(m);
              return (
                <tr key={m.id} className="transition hover:bg-primary-50/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={m.name} image={m.image} size={32} />
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 truncate font-medium text-ink">
                          <Link href={adminHref(`/users/${m.id}`)} className="hover:text-primary">{memberName(m)}</Link>
                          {role && <span className="rounded-full bg-primary-50 px-2 text-[11px] font-semibold text-primary">{role}</span>}
                        </p>
                        <p className="truncate text-xs">{m.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-4 py-3 ${m.registeredAt ? "text-ink" : "text-amber-700"}`}>{memberDetail(m)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {m._count.sheets > 0 ? (
                      <Link href={adminHref(`/sheets?status=ALL&q=${encodeURIComponent(m.email)}`)} className="font-medium text-primary hover:underline">
                        {formatNumber(m._count.sheets)}
                      </Link>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">{formatThaiDate(m.createdAt)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">{seen ? formatThaiDate(seen) : "–"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={adminHref(`/users/${m.id}`)} className="whitespace-nowrap rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-white">
                      แก้ไขข้อมูล
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="หน้า" className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={adminHref(`/users?${query({ page: page - 1 })}`)} className="btn-outline btn-sm">‹ ก่อนหน้า</Link>}
          <span>หน้า {page} / {pages}</span>
          {page < pages && <Link href={adminHref(`/users?${query({ page: page + 1 })}`)} className="btn-outline btn-sm">ถัดไป ›</Link>}
        </nav>
      )}
    </div>
  );
}
