import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { CalendarIcon, EyeIcon } from "@/components/sheet-card";
import { BackButton } from "@/components/back-button";
import { ShareButton } from "@/components/share-button";
import { StatusBadge } from "@/components/status-badge";
import { gradeLabel } from "@/lib/constants";
import { formatNumber, formatThaiDate } from "@/lib/format";
import { getRelatedSheets, getSheetDetail } from "@/lib/queries";
import { SheetCardCompact } from "@/components/sheet-card";
import { getCurrentUser, loginUrl } from "@/lib/session";
import Link from "next/link";
import { adminHref, withBase } from "@/lib/urls";
import { SubjectBadge } from "@/components/subject-badge";

export async function generateMetadata(props: PageProps<"/sheets/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const sheet = await getSheetDetail(id);
  const published = sheet?.status === "APPROVED";
  return { title: published ? sheet.title : "ชีทสรุป", robots: { index: published } };
}

export default async function SheetDetailPage(props: PageProps<"/sheets/[id]">) {
  const { id } = await props.params;
  // Anyone can see a published sheet's details; reading it (the button) needs login.
  const [user, sheet] = await Promise.all([getCurrentUser(), getSheetDetail(id)]);
  if (!sheet) notFound();
  if (sheet.status !== "APPROVED") {
    // Pending / rejected sheets are visible to their author and admins only
    if (!user) redirect(loginUrl(`/sheets/${id}`));
    if (!user.isAdmin && sheet.authorId !== user.id) notFound();
  }

  // Prototype sheets (npm run db:demo) have no real file
  const isDemo = sheet.pdfKey.startsWith("demo/");
  const published = sheet.status === "APPROVED";
  const related = await getRelatedSheets(sheet);

  return (
    <div className="container-page py-8 md:py-12">
      <BackButton />

      {!published && !isDemo && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-5 py-4 text-sm ring-1 ring-amber-200">
          <StatusBadge status={sheet.status} />
          <span className="text-amber-900">
            {sheet.status === "PENDING" && "ชีทนี้กำลังรอผู้ดูแลตรวจสอบ ยังไม่แสดงต่อสาธารณะ"}
            {sheet.status === "REJECTED" && `ชีทนี้ไม่ผ่านการตรวจสอบ${sheet.rejectReason ? ` – ${sheet.rejectReason}` : ""}`}
            {sheet.status === "HIDDEN" && "ผู้ดูแลซ่อนชีทนี้จากหน้าสาธารณะ"}
          </span>
          {user?.isAdmin && (
            <Link href={adminHref(`/sheets/${sheet.id}`)} className="ml-auto font-medium text-primary underline-offset-4 hover:underline">
              ไปหน้าตรวจสอบ →
            </Link>
          )}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-10">
        <div className="overflow-hidden rounded-2xl bg-primary-50 shadow-brand">
          <img
            src={sheet.cover.large}
            srcSet={`${sheet.cover.small} 640w, ${sheet.cover.large} 1280w`}
            sizes="(min-width: 1024px) 700px, 94vw"
            width={1280}
            height={720}
            alt=""
            className="aspect-video w-full object-cover"
          />
        </div>

        <div className="flex flex-col">
          <div className="flex flex-wrap gap-2">
            <SubjectBadge id={sheet.subject.id} name={sheet.subject.name} />
            <span className="rounded-full bg-primary px-3 py-0.5 text-sm font-medium text-white">{gradeLabel(sheet.grade)}</span>
            <span className="rounded-full bg-primary-50 px-3 py-0.5 text-sm font-medium text-primary">
              ภาคเรียนที่ {sheet.semester}/{sheet.academicYear}
            </span>
          </div>
          <h1 className="mt-4 text-[clamp(1.5rem,2.8vw,2.1rem)] font-bold">{sheet.title}</h1>

          <Link
            href={`/u/${sheet.author.id}`}
            className="mt-5 flex items-center gap-3 rounded-2xl bg-primary-50/70 px-4 py-3 transition hover:bg-primary-50"
          >
            <Avatar name={sheet.author.name} image={sheet.author.image} size={44} />
            <div className="min-w-0">
              <p className="text-xs">จัดทำโดย</p>
              <p className="truncate font-semibold text-ink">{sheet.author.name}</p>
            </div>
            <span className="ml-auto shrink-0 text-sm font-medium text-primary">ดูโปรไฟล์ →</span>
          </Link>

          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink">
            <Meta icon={<CalendarIcon className="size-4" />} label="วันที่ทำ">{formatThaiDate(sheet.createdAt)}</Meta>
            <Meta icon={<PagesIcon />} label="จำนวนหน้า">{sheet.pageCount} หน้า</Meta>
            <Meta icon={<EyeIcon />} label="ผู้เข้าชม">{formatNumber(sheet.viewCount)} ครั้ง</Meta>
          </ul>

          <div className="mt-6 flex flex-wrap gap-3">
            {published ? (
              // Signed out → login first, then straight on to the sheet
              <a
                href={withBase(`/sheets/${sheet.id}/read`)}
                {...(user && !isDemo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="btn-primary min-w-[200px] flex-1 sm:flex-none"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden>
                  <path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2zM22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" />
                </svg>
                อ่านชีท
              </a>
            ) : (
              <a href={withBase(`/api/sheets/${sheet.id}/pdf`)} target="_blank" rel="noopener" className="btn-outline flex-1 sm:flex-none">
                ดูไฟล์ PDF (ส่วนตัว)
              </a>
            )}
            {published && (
              <ShareButton
                path={`/sheets/${sheet.id}`}
                title={sheet.title}
                text={`ชีทสรุป ${sheet.subject.name} ${gradeLabel(sheet.grade)} บน Connext Learning`}
                className="btn-outline"
              />
            )}
          </div>
        </div>
      </div>

      <section className="card mt-10 p-6">
        <h2 className="mb-3 text-xl font-semibold">คำอธิบาย</h2>
        <p className="whitespace-pre-line break-words">{sheet.description}</p>
      </section>

      {related.items.length > 0 && (
        <section className="mt-12" aria-labelledby="related-title">
          <h2 id="related-title" className="mb-5 text-xl font-semibold">
            {related.kind === "author" ? `ชีทอื่น ๆ จาก ${sheet.author.name}` : `ชีทแนะนำ ${gradeLabel(sheet.grade)}`}
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.items.map((s) => (
              <li key={s.id}><SheetCardCompact sheet={s} /></li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Meta({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5" title={label}>
      <span className="grid size-8 place-items-center rounded-full bg-primary-50 text-primary">{icon}</span>
      <span className="sr-only">{label}: </span>
      <span className="font-medium">{children}</span>
    </li>
  );
}

function PagesIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}
