import { CoverModeForm } from "@/components/admin/cover-mode-form";
import { CoverUploader } from "@/components/admin/review-actions";
import { db } from "@/lib/db";
import { subjectCover, uniformCover } from "@/lib/covers";
import { getCoverSettings } from "@/lib/queries";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "ภาพปก" };

export default async function AdminCoversPage() {
  await requireAdminPage("/covers");
  const [settings, subjects] = await Promise.all([
    getCoverSettings(),
    db.subject.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h2 className="text-lg font-semibold">รูปแบบภาพปกเริ่มต้น</h2>
        <p className="mb-5 text-sm">ภาพ 16:9 (แนะนำ 1280×720) ระบบครอปให้อัตโนมัติ · ตั้งภาพเฉพาะชีทได้ในหน้าตรวจสอบชีท</p>
        <CoverModeForm mode={settings.coverMode} />
      </section>

      <section className={`card p-6 ${settings.coverMode === "UNIFORM" ? "ring-2 ring-primary" : "opacity-90"}`}>
        <h2 className="text-lg font-semibold">ภาพปกกลาง (เหมือนกันทั้งหมด)</h2>
        <p className="mb-5 text-sm">
          {settings.coverMode === "UNIFORM" ? "กำลังใช้งาน – ทุกชีทจะแสดงภาพนี้" : "ใช้เมื่อเลือกรูปแบบ “เหมือนกันทั้งหมด”"}
        </p>
        <div className="max-w-md">
          <CoverUploader target="uniform" src={uniformCover(settings).small} title="ภาพปกกลาง" isCustom={!!settings.uniformCoverKey} compact />
        </div>
      </section>

      <section className={`card p-6 ${settings.coverMode === "SUBJECT" ? "ring-2 ring-primary" : "opacity-90"}`}>
        <h2 className="text-lg font-semibold">ภาพปกแต่ละวิชา</h2>
        <p className="mb-5 text-sm">
          {settings.coverMode === "SUBJECT" ? "กำลังใช้งาน – ชีทจะแสดงภาพปกตามวิชา" : "ใช้เมื่อเลือกรูปแบบ “แยกตามวิชา”"}
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
