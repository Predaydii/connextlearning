import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { EyeIcon } from "@/components/sheet-card";
import { ColumnChart, BarList } from "@/components/admin/charts";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/session";
import { gradeLabel, SUBJECTS } from "@/lib/constants";
import { formatNumber, formatThaiDate } from "@/lib/format";
import { adminHref } from "@/lib/urls";

export const metadata = { title: "แดชบอร์ด" };

const DAYS = 14;

function lastDays(n: number) {
  // Calendar days in Thailand time, oldest first
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" });
  return Array.from({ length: n }, (_, i) => fmt.format(new Date(Date.now() - (n - 1 - i) * 86_400_000)));
}

export default async function AdminDashboard() {
  await requireAdminPage("/");
  return <Dashboard data={await loadDashboard()} />;
}

async function loadDashboard() {
  const since = new Date(Date.now() - DAYS * 86_400_000);
  const [byStatus, users, views, daily, bySubject, topViewed, pending, contributors] = await Promise.all([
    db.sheet.groupBy({ by: ["status"], _count: { _all: true } }),
    db.user.count(),
    db.sheet.aggregate({ _sum: { viewCount: true } }),
    db.$queryRaw<{ d: string; c: number }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Bangkok')::date, 'YYYY-MM-DD') AS d, count(*)::int AS c
      FROM "Sheet" WHERE "createdAt" >= ${since} GROUP BY 1`,
    db.sheet.groupBy({ by: ["subjectId"], where: { status: "APPROVED" }, _count: { _all: true } }),
    db.sheet.findMany({
      where: { status: "APPROVED" },
      orderBy: { viewCount: "desc" },
      take: 5,
      select: { id: true, title: true, viewCount: true, grade: true, subject: { select: { name: true } } },
    }),
    db.sheet.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 6,
      select: { id: true, title: true, createdAt: true, grade: true, subject: { select: { name: true } }, author: { select: { name: true, image: true } } },
    }),
    db.sheet.groupBy({
      by: ["authorId"],
      where: { status: "APPROVED" },
      _count: { _all: true },
      _sum: { viewCount: true },
      orderBy: { _count: { authorId: "desc" } },
      take: 5,
    }),
  ]);

  const authors = await db.user.findMany({
    where: { id: { in: contributors.map((c) => c.authorId) } },
    select: { id: true, name: true, image: true },
  });
  return { byStatus, users, views, daily, bySubject, topViewed, pending, contributors, authors, days: lastDays(DAYS) };
}

function Dashboard({ data }: { data: Awaited<ReturnType<typeof loadDashboard>> }) {
  const { byStatus, users, views, daily, bySubject, topViewed, pending, contributors } = data;
  const status = Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])) as Record<string, number>;
  const dailyMap = new Map(daily.map((r) => [r.d, r.c]));
  const days = data.days.map((d) => ({
    key: d,
    label: new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" }).format(new Date(`${d}T00:00:00`)),
    value: dailyMap.get(d) ?? 0,
  }));
  const subjectCounts = new Map(bySubject.map((r) => [r.subjectId, r._count._all]));
  const subjectRows = SUBJECTS.map((s) => ({ key: s.id, label: s.name, value: subjectCounts.get(s.id) ?? 0 })).sort(
    (a, b) => b.value - a.value,
  );
  const authors = new Map(data.authors.map((u) => [u.id, u]));

  const tiles = [
    { label: "ชีทที่เผยแพร่", value: status.APPROVED ?? 0, href: adminHref("/sheets?status=APPROVED") },
    { label: "รอตรวจสอบ", value: status.PENDING ?? 0, href: adminHref("/sheets"), highlight: (status.PENDING ?? 0) > 0 },
    { label: "ผู้ใช้งาน", value: users },
    { label: "ยอดผู้เข้าชมรวม", value: views._sum.viewCount ?? 0 },
  ];

  return (
    <div className="grid gap-6">
      {pending.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent/20 px-5 py-4 ring-1 ring-accent/60">
          <p className="font-medium text-ink">มี {formatNumber(status.PENDING ?? 0)} ชีทรอตรวจสอบ</p>
          <Link href={adminHref(`/sheets/${pending[0].id}`)} className="btn-primary btn-sm">เริ่มตรวจจากชีทที่รอนานสุด →</Link>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => {
          const body = (
            <>
              <dt className="text-sm">{t.label}</dt>
              <dd className="mt-1 text-3xl font-semibold text-ink">{formatNumber(t.value)}</dd>
            </>
          );
          const cls = `card block p-5 ${t.highlight ? "ring-2 ring-accent" : ""}`;
          return t.href ? (
            <Link key={t.label} href={t.href} className={`${cls} transition hover:shadow-brand`}>{body}</Link>
          ) : (
            <div key={t.label} className={cls}>{body}</div>
          );
        })}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <section className="card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">คิวรอตรวจสอบ</h2>
            {pending.length > 0 && <Link href={adminHref("/sheets")} className="text-sm font-medium text-primary hover:underline">ดูทั้งหมด</Link>}
          </div>
          {pending.length === 0 ? (
            <p className="rounded-xl bg-primary-50/60 py-8 text-center text-sm">ตรวจครบแล้ว ไม่มีชีทค้าง</p>
          ) : (
            <ul className="divide-y divide-line">
              {pending.map((s) => (
                <li key={s.id}>
                  <Link href={adminHref(`/sheets/${s.id}`)} className="flex items-center gap-3 py-3 hover:text-primary">
                    <Avatar name={s.author.name} image={s.author.image} size={32} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{s.title}</p>
                      <p className="truncate text-xs">{s.subject.name} · {gradeLabel(s.grade)} · ส่งเมื่อ {formatThaiDate(s.createdAt)}</p>
                    </div>
                    <span aria-hidden className="text-primary">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-semibold">ชีทที่ส่งเข้ามา</h2>
          <p className="mb-5 text-sm">ต่อวัน ย้อนหลัง {DAYS} วัน</p>
          <ColumnChart data={days} unit="ชีท" />
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-6">
          <h2 className="text-lg font-semibold">ชีทที่เผยแพร่ตามวิชา</h2>
          <p className="mb-5 text-sm">ทั้งหมด {formatNumber(status.APPROVED ?? 0)} ชีท</p>
          <BarList data={subjectRows} unit="ชีท" />
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">ชีทยอดนิยม</h2>
          {topViewed.length === 0 ? (
            <p className="py-6 text-center text-sm">ยังไม่มีข้อมูล</p>
          ) : (
            <ol className="divide-y divide-line">
              {topViewed.map((s, i) => (
                <li key={s.id} className="flex items-center gap-3 py-3">
                  <span className="w-5 text-center text-sm font-semibold text-primary">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={`/sheets/${s.id}`} className="block truncate text-sm font-medium text-ink hover:text-primary">{s.title}</Link>
                    <p className="text-xs">{s.subject.name} · {gradeLabel(s.grade)}</p>
                  </div>
                  <span className="flex items-center gap-1 text-sm text-ink"><EyeIcon className="size-4 text-primary" />{formatNumber(s.viewCount)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">ผู้แชร์ชีทมากที่สุด</h2>
          {contributors.length === 0 ? (
            <p className="py-6 text-center text-sm">ยังไม่มีข้อมูล</p>
          ) : (
            <ol className="divide-y divide-line">
              {contributors.map((c) => {
                const u = authors.get(c.authorId);
                return (
                  <li key={c.authorId} className="flex items-center gap-3 py-3">
                    <Avatar name={u?.name ?? "?"} image={u?.image} size={32} />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{u?.name ?? "ผู้ใช้"}</p>
                    <span className="text-sm text-ink">{formatNumber(c._count._all)} ชีท</span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
