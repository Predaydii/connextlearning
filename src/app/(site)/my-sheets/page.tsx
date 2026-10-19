import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { EyeIcon } from "@/components/sheet-card";
import { db } from "@/lib/db";
import { resolveCover } from "@/lib/covers";
import { getCoverSettings } from "@/lib/queries";
import { requireUser } from "@/lib/session";
import { gradeLabel } from "@/lib/constants";
import { formatNumber, formatThaiDate } from "@/lib/format";

export const metadata: Metadata = { title: "ชีทของฉัน", robots: { index: false } };

export default async function MySheetsPage() {
  const user = await requireUser("/my-sheets");
  const [sheets, settings] = await Promise.all([
    db.sheet.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { subject: { select: { id: true, name: true, coverKey: true } } },
    }),
    getCoverSettings(),
  ]);

  const counts = {
    total: sheets.length,
    approved: sheets.filter((s) => s.status === "APPROVED").length,
    pending: sheets.filter((s) => s.status === "PENDING").length,
    views: sheets.reduce((n, s) => n + s.viewCount, 0),
  };

  return (
    <div className="container-page py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-sky">สวัสดี {user.name}</p>
          <h1 className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold">ชีทของฉัน</h1>
        </div>
        <Link href="/sheets/upload" className="btn-primary btn-sm">+ อัปโหลดชีทใหม่</Link>
      </div>

      <dl className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          ["ชีททั้งหมด", counts.total],
          ["เผยแพร่แล้ว", counts.approved],
          ["รอตรวจสอบ", counts.pending],
          ["ยอดผู้เข้าชมรวม", counts.views],
        ].map(([label, value]) => (
          <div key={label} className="card p-5">
            <dt className="text-sm">{label}</dt>
            <dd className="mt-1 text-2xl font-bold text-primary">{formatNumber(value as number)}</dd>
          </div>
        ))}
      </dl>

      {sheets.length === 0 ? (
        <div className="card px-6 py-16 text-center">
          <p className="text-lg font-semibold text-ink">คุณยังไม่ได้แชร์ชีทสรุป</p>
          <p className="mt-1 text-sm">เริ่มแบ่งปันชีทสรุปของคุณให้เพื่อน ๆ ได้เลย</p>
          <Link href="/sheets/upload" className="btn-primary btn-sm mt-6">อัปโหลดชีทแรก</Link>
        </div>
      ) : (
        <ul className="grid gap-4">
          {sheets.map((s) => {
            const cover = resolveCover(s, settings);
            return (
              <li key={s.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                <img src={cover.small} alt="" width={640} height={360} loading="lazy" className="aspect-video w-full rounded-xl object-cover sm:w-44" />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <StatusBadge status={s.status} />
                    <span className="text-xs">{s.subject.name} · {gradeLabel(s.grade)} · เทอม {s.semester}/{s.academicYear}</span>
                  </div>
                  <Link href={`/sheets/${s.id}`} className="line-clamp-1 font-semibold text-ink hover:text-primary">{s.title}</Link>
                  <p className="text-xs">ส่งเมื่อ {formatThaiDate(s.createdAt)} · {s.pageCount} หน้า</p>
                  {s.status === "REJECTED" && s.rejectReason && (
                    <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">เหตุผล: {s.rejectReason}</p>
                  )}
                </div>
                <span className="flex items-center gap-1 text-sm text-primary sm:w-20 sm:justify-end" title="ผู้เข้าชม">
                  <EyeIcon /> {formatNumber(s.viewCount)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
