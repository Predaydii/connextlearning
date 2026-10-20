import { CoverUploader } from "@/components/admin/review-actions";
import { VideoUploader } from "@/components/admin/video-uploader";
import { GRADE_ART, gradeArt, videoUrl } from "@/lib/covers";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "หน้าแรก" };

export default async function AdminHomePage() {
  await requireAdminPage("/home");
  const [setting, images] = await Promise.all([
    db.siteSetting.findUnique({ where: { id: 1 }, select: { homeVideoKey: true } }),
    db.homeImage.findMany(),
  ]);
  const custom = Object.fromEntries(images.map((i) => [i.slot, i.imageKey]));

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h2 className="text-lg font-semibold">ภาพชีทสรุปแยกตามชั้น</h2>
        <p className="mb-5 text-sm">ภาพแนวตั้ง 4:5 (แนะนำ 1280×1600) ระบบครอปให้อัตโนมัติ · กดภาพบนหน้าแรกแล้วจะไปยังชีทของชั้นนั้น</p>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3">
          {GRADE_ART.map((g) => (
            <CoverUploader
              key={g.slot}
              target={`grade:${g.slot}`}
              src={gradeArt(g.slot, custom[g.slot]).src}
              title={g.label}
              isCustom={!!custom[g.slot]}
              portrait
            />
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold">วิดีโอท้ายหน้าแรก</h2>
        <p className="mb-5 text-sm">แสดงขนาด 16:9 ก่อนถึงส่วนท้ายของหน้าแรก · ไม่มีวิดีโอ = ซ่อนส่วนนี้</p>
        <VideoUploader slot="home" src={setting?.homeVideoKey ? videoUrl(setting.homeVideoKey) : null} />
      </section>
    </div>
  );
}
