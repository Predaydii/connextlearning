import { CoverModeForm, MissingPageCovers } from "@/components/admin/cover-mode-form";
import { CoverUploader } from "@/components/admin/review-actions";
import { db } from "@/lib/db";
import { subjectCover } from "@/lib/covers";
import { getCoverSettings } from "@/lib/queries";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "ภาพปก" };

export default async function AdminCoversPage() {
  await requireAdminPage("/covers");
  const [settings, subjects, missing] = await Promise.all([
    getCoverSettings(),
    db.subject.findMany({ orderBy: { sortOrder: "asc" } }),
    db.sheet.count({ where: { pageCoverKey: null, NOT: { pdfKey: { startsWith: "demo/" } } } }),
  ]);

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h2 className="text-lg font-semibold">ภาพปกการ์ดชีท</h2>
        <p className="mb-5 text-sm">ภาพที่ตั้งเฉพาะชีท (ในหน้าตรวจสอบชีท) แสดงก่อนเสมอ ไม่ว่าจะเลือกแบบไหน</p>
        <CoverModeForm mode={settings.coverMode} />
        {settings.coverMode === "FIRST_PAGE" && missing > 0 && (
          <div className="mt-4">
            <MissingPageCovers count={missing} />
          </div>
        )}
      </section>

      <section className={`card p-6 ${settings.coverMode === "SUBJECT" ? "ring-2 ring-primary" : ""}`}>
        <h2 className="text-lg font-semibold">ภาพปกแต่ละวิชา</h2>
        <p className="mb-5 text-sm">
          {settings.coverMode === "SUBJECT" ? "กำลังใช้งาน – ชีทจะแสดงภาพปกตามวิชา" : "ใช้กับชีทที่ยังไม่มีภาพหน้าแรก"} · ภาพ 16:9 (แนะนำ 1280×720) ระบบครอปให้อัตโนมัติ
        </p>
        {subjects.length === 0 ? (
          <p className="text-sm text-red-600">ยังไม่มีข้อมูลวิชาในฐานข้อมูล – รัน <code>npm run db:seed</code></p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {subjects.map((s) => (
              <CoverUploader key={s.id} target={s.id} src={subjectCover(s).small} title={s.name} isCustom={!!s.coverKey} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
