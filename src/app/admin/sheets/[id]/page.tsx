import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { StatusBadge } from "@/components/status-badge";
import { ApproveButton, CoverUploader, DeleteButton, RejectForm } from "@/components/admin/review-actions";
import { db } from "@/lib/db";
import { resolveCover } from "@/lib/covers";
import { getCoverSettings } from "@/lib/queries";
import { requireAdminPage } from "@/lib/session";
import { gradeLabel } from "@/lib/constants";
import { formatBytes, formatNumber, formatThaiDateTime } from "@/lib/format";
import { adminHref, withBase } from "@/lib/urls";

export const metadata = { title: "ตรวจสอบชีท" };

export default async function AdminSheetReviewPage(props: PageProps<"/admin/sheets/[id]">) {
  const { id } = await props.params;
  await requireAdminPage(`/sheets/${id}`);

  const [sheet, settings, next] = await Promise.all([
    db.sheet.findUnique({
      where: { id },
      include: {
        subject: { select: { id: true, name: true, coverKey: true } },
        author: { select: { name: true, email: true, image: true, _count: { select: { sheets: true } } } },
        reviewedBy: { select: { name: true } },
      },
    }),
    getCoverSettings(),
    // The next sheet in the review queue (oldest pending first)
    db.sheet.findFirst({ where: { status: "PENDING", id: { not: id } }, orderBy: { createdAt: "asc" }, select: { id: true } }),
  ]);
  if (!sheet) notFound();
  const cover = resolveCover(sheet, settings);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={adminHref("/sheets")} className="text-sm font-medium text-primary hover:underline">← กลับไปรายการ</Link>
        {next && <Link href={adminHref(`/sheets/${next.id}`)} className="text-sm font-medium text-primary hover:underline">ชีทถัดไปที่รอตรวจ →</Link>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* Preview */}
        <div className="card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-5 py-3">
            <p className="text-sm font-medium text-ink">ตัวอย่างไฟล์ PDF · {sheet.pageCount} หน้า · {formatBytes(sheet.pdfBytes)}</p>
            <a href={withBase(`/api/sheets/${sheet.id}/pdf`)} target="_blank" rel="noopener" className="text-sm font-medium text-primary hover:underline">
              เปิดในแท็บใหม่ ↗
            </a>
          </div>
          <iframe src={withBase(`/api/sheets/${sheet.id}/pdf`)} title="ตัวอย่างไฟล์ PDF" className="h-[55vh] min-h-[360px] w-full bg-primary-50 lg:h-[75vh] lg:min-h-[520px]" />
        </div>

        {/* Details & actions */}
        <div className="grid content-start gap-6">
          <section className="card grid gap-4 p-6">
            <h3 className="font-semibold">การตรวจสอบ</h3>
            {sheet.status !== "APPROVED" && (
              <ApproveButton id={sheet.id} label={sheet.status === "REJECTED" ? "อนุมัติ (เปลี่ยนเป็นเผยแพร่)" : undefined} />
            )}
            <RejectForm id={sheet.id} defaultReason={sheet.rejectReason} />
            {sheet.status === "APPROVED" && (
              <p className="text-xs">การไม่อนุมัติชีทที่เผยแพร่แล้วจะซ่อนจากหน้าสาธารณะทันที และไม่มีใครเปิดอ่านได้อีก</p>
            )}
          </section>

          <section className="card p-6">
            <div className="mb-3 flex items-center gap-2">
              <StatusBadge status={sheet.status} />
              {sheet.status === "APPROVED" && (
                <a href={withBase(`/sheets/${sheet.id}`)} target="_blank" rel="noopener" className="text-xs font-medium text-primary hover:underline">ดูหน้าสาธารณะ ↗</a>
              )}
            </div>
            <h2 className="text-xl font-bold">{sheet.title}</h2>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt>วิชา</dt><dd className="text-ink">{sheet.subject.name}</dd>
              <dt>ระดับชั้น</dt><dd className="text-ink">{gradeLabel(sheet.grade)}</dd>
              <dt>ภาคเรียน</dt><dd className="text-ink">{sheet.semester}/{sheet.academicYear}</dd>
              <dt>ส่งเมื่อ</dt><dd className="text-ink">{formatThaiDateTime(sheet.createdAt)}</dd>
              <dt>ผู้เข้าชม</dt><dd className="text-ink">{formatNumber(sheet.viewCount)}</dd>
              {sheet.reviewedBy && (
                <>
                  <dt>ตรวจโดย</dt>
                  <dd className="text-ink">{sheet.reviewedBy.name}{sheet.reviewedAt && ` · ${formatThaiDateTime(sheet.reviewedAt)}`}</dd>
                </>
              )}
            </dl>
            <h3 className="mt-5 mb-1 text-sm font-semibold">คำอธิบาย</h3>
            <p className="whitespace-pre-line break-words text-sm">{sheet.description}</p>

            <div className="mt-5 flex items-center gap-3 rounded-xl bg-primary-50 p-3">
              <Avatar name={sheet.author.name} image={sheet.author.image} size={40} />
              <div className="min-w-0 text-sm">
                <p className="truncate font-semibold text-ink">{sheet.author.name}</p>
                <p className="truncate text-xs">{sheet.author.email} · ส่งมาแล้ว {sheet.author._count.sheets} ชีท</p>
              </div>
            </div>
          </section>


          <section className="card grid gap-3 p-6">
            <h3 className="font-semibold">ภาพปกของชีทนี้ (16:9)</h3>
            <p className="text-xs">
              ถ้าไม่ตั้งค่า ระบบจะใช้{settings.coverMode === "UNIFORM" ? "ภาพปกกลางของทุกชีท" : `ภาพปกของวิชา${sheet.subject.name}`} ·{" "}
              <Link href={adminHref("/covers")} className="text-primary hover:underline">ตั้งค่าภาพปกเริ่มต้น</Link>
            </p>
            <CoverUploader target={`sheet:${sheet.id}`} src={cover.small} title={sheet.title} isCustom={!!sheet.coverKey} compact />
          </section>

          <section className="card p-4">
            <DeleteButton id={sheet.id} />
          </section>
        </div>
      </div>
    </div>
  );
}
