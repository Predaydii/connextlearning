import Link from "next/link";
import Form from "next/form";
import { Avatar } from "@/components/avatar";
import { StatusBadge } from "@/components/status-badge";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/session";
import { gradeLabel } from "@/lib/constants";
import { formatNumber, formatThaiDateTime } from "@/lib/format";
import type { Prisma, SheetStatus } from "@/generated/prisma/client";
import { adminHref } from "@/lib/urls";

export const metadata = { title: "ตรวจสอบชีท" };

const PER_PAGE = 30;
const TABS: { value: SheetStatus | "ALL"; label: string }[] = [
  { value: "PENDING", label: "รอตรวจสอบ" },
  { value: "APPROVED", label: "เผยแพร่แล้ว" },
  { value: "REJECTED", label: "ไม่อนุมัติ" },
  { value: "HIDDEN", label: "ซ่อนอยู่" },
  { value: "ALL", label: "ทั้งหมด" },
];

export default async function AdminSheetsPage(props: PageProps<"/admin/sheets">) {
  await requireAdminPage("/sheets");
  const sp = await props.searchParams;
  const status = TABS.find((t) => t.value === sp.status)?.value ?? "PENDING";
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.SheetWhereInput = {
    ...(status !== "ALL" && { status }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { author: { name: { contains: q, mode: "insensitive" } } },
        { author: { email: { contains: q, mode: "insensitive" } } },
      ],
    }),
  };

  const [rows, total, counts] = await Promise.all([
    db.sheet.findMany({
      where,
      // Oldest pending first (a queue); newest first otherwise
      orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true, title: true, status: true, grade: true, semester: true, academicYear: true, createdAt: true,
        viewCount: true, pageCount: true,
        subject: { select: { name: true } },
        author: { select: { name: true, email: true, image: true } },
      },
    }),
    db.sheet.count({ where }),
    db.sheet.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countOf = (s: SheetStatus | "ALL") =>
    s === "ALL" ? counts.reduce((n, c) => n + c._count._all, 0) : counts.find((c) => c.status === s)?._count._all ?? 0;
  const pages = Math.max(1, Math.ceil(total / PER_PAGE));
  const link = (patch: Record<string, string | number>) => {
    const p = new URLSearchParams({ status, ...(q && { q }), page: String(page), ...Object.fromEntries(Object.entries(patch).map(([k, v]) => [k, String(v)])) });
    if (p.get("page") === "1") p.delete("page");
    return adminHref(`/sheets?${p}`);
  };

  return (
    <div className="grid gap-5">
      {sp.deleted === "1" && (
        <p role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">ลบชีทถาวรแล้ว</p>
      )}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="สถานะ" className="-mx-1 flex min-w-0 gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-card ring-1 ring-line [scrollbar-width:none] lg:mx-0">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={link({ status: t.value, page: 1 })}
              aria-current={status === t.value ? "true" : undefined}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition ${status === t.value ? "bg-primary text-white" : "text-ink hover:text-primary"}`}
            >
              {t.label} <span className="opacity-70">({formatNumber(countOf(t.value))})</span>
            </Link>
          ))}
        </nav>
        <Form action={adminHref("/sheets")} className="flex w-full min-w-0 gap-2 lg:w-auto">
          <input type="hidden" name="status" value={status} />
          <input name="q" defaultValue={q} placeholder="ค้นหาชื่อชีท / ผู้ส่ง" className="field min-w-0 flex-1 py-2 text-sm lg:w-64 lg:flex-none" aria-label="ค้นหา" />
          <button className="btn-primary btn-sm">ค้นหา</button>
        </Form>
      </div>

      <div className="card relative min-w-0 overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-line bg-primary-50/60 text-xs text-body">
            <tr>
              <th className="px-4 py-3 font-medium">ชีท</th>
              <th className="px-4 py-3 font-medium">ผู้ส่ง</th>
              <th className="px-4 py-3 font-medium">ส่งเมื่อ</th>
              <th className="px-4 py-3 font-medium">สถานะ</th>
              <th className="px-4 py-3 text-right font-medium">เข้าชม</th>
              <th className="px-4 py-3"><span className="sr-only">จัดการ</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-16 text-center">ไม่พบชีท</td></tr>
            )}
            {rows.map((s) => (
              <tr key={s.id} className="transition hover:bg-primary-50/40">
                <td className="max-w-[320px] px-4 py-3">
                  <Link href={adminHref(`/sheets/${s.id}`)} className="line-clamp-1 font-medium text-ink hover:text-primary">{s.title}</Link>
                  <p className="text-xs">
                    {s.subject.name} · {gradeLabel(s.grade)} · เทอม {s.semester}/{s.academicYear} · {s.pageCount} หน้า                  </p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar name={s.author.name} image={s.author.image} size={28} />
                    <div className="min-w-0">
                      <p className="truncate text-ink">{s.author.name}</p>
                      <p className="truncate text-xs">{s.author.email}</p>
                    </div>
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs">{formatThaiDateTime(s.createdAt)}</td>
                <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                <td className="px-4 py-3 text-right tabular-nums text-ink">{formatNumber(s.viewCount)}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={adminHref(`/sheets/${s.id}`)} className="whitespace-nowrap rounded-full bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-white">
                    {s.status === "PENDING" ? "ตรวจสอบ" : "จัดการ"}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <nav aria-label="หน้า" className="flex items-center justify-center gap-3 text-sm">
          {page > 1 && <Link href={link({ page: page - 1 })} className="btn-outline btn-sm">‹ ก่อนหน้า</Link>}
          <span>หน้า {page} / {pages}</span>
          {page < pages && <Link href={link({ page: page + 1 })} className="btn-outline btn-sm">ถัดไป ›</Link>}
        </nav>
      )}
    </div>
  );
}
