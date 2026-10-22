import { CoverUploader } from "@/components/admin/review-actions";
import { VideoUploader } from "@/components/admin/video-uploader";
import { bannerSrc, GRADE_ART, gradeArt, videoUrl } from "@/lib/covers";
import { BannerManager } from "@/components/admin/banner-manager";
import { SiteImageForm, SiteNameForm } from "@/components/admin/site-image-form";
import { DEFAULT_SITE_NAME } from "@/lib/constants";
import { withBase } from "@/lib/urls";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "หน้าแรก" };

export default async function AdminHomePage() {
  await requireAdminPage("/home");
  const [setting, images, banners] = await Promise.all([
    db.siteSetting.findUnique({ where: { id: 1 }, select: { homeVideoKey: true, homeVideoMobileKey: true, faviconKey: true, ogImageKey: true, siteName: true } }),
    db.homeImage.findMany(),
    db.banner.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  const custom = Object.fromEntries(images.map((i) => [i.slot, i.imageKey]));

  return (
    <div className="grid gap-6">
      {/* Same order as the landing page: video → sheets by grade → banners */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold">วิดีโอถัดจากส่วนบนสุด (hero)</h2>
        <p className="mb-5 text-sm">
          เล่นอัตโนมัติแบบไม่มีเสียงและวนซ้ำ ขยายเต็มจอเมื่อเลื่อนลงมา · อัปโหลดได้ 2 แบบ: แนวนอนสำหรับคอมพิวเตอร์และ iPad,
          แนวตั้งสำหรับโทรศัพท์ (ไม่มีแนวตั้ง = ใช้แนวนอนแทน) · ไม่มีวิดีโอเลย = ซ่อนส่วนนี้
        </p>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <h3 className="mb-3 font-semibold text-ink">แนวนอน 16:9 · คอมพิวเตอร์ / iPad</h3>
            <VideoUploader slot="home" src={setting?.homeVideoKey ? videoUrl(setting.homeVideoKey) : null} />
          </div>
          <div>
            <h3 className="mb-3 font-semibold text-ink">แนวตั้ง 9:16 · โทรศัพท์</h3>
            <VideoUploader slot="homeMobile" portrait src={setting?.homeVideoMobileKey ? videoUrl(setting.homeVideoMobileKey) : null} />
          </div>
        </div>
      </section>

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
        <h2 className="text-lg font-semibold">แบนเนอร์ (2000×600 px)</h2>
        <p className="mb-5 text-sm">แสดงก่อนส่วนห้องเรียนออนไลน์ เลื่อนเองอัตโนมัติและปัดด้วยนิ้วได้ · ระบบครอปเป็นสัดส่วน 10:3 ให้อัตโนมัติ · ไม่มีแบนเนอร์ = ซ่อนส่วนนี้</p>
        <BannerManager banners={banners.map((b) => ({ id: b.id, src: bannerSrc(b.imageKey).small, linkUrl: b.linkUrl }))} />
      </section>

      <section className="card p-6">
        <h2 className="text-lg font-semibold">ชื่อเว็บ ไอคอน และรูปตอนแชร์ลิงก์</h2>
        <p className="mb-5 text-sm">คลิกที่รูปเพื่อเปลี่ยน · ไอคอนกับชื่อแสดงบนแท็บเบราว์เซอร์และหน้าจอโทรศัพท์ · รูปแชร์แสดงเมื่อส่งลิงก์เว็บใน LINE, Facebook ฯลฯ</p>
        <div className="flex flex-wrap gap-10">
          <div className="min-w-0 flex-1 basis-80">
            <h3 className="mb-3 font-semibold text-ink">ไอคอนเว็บ (สี่เหลี่ยมจัตุรัส อย่างน้อย 512×512) และชื่อเว็บ</h3>
            <div className="flex flex-wrap gap-6">
              <SiteImageForm kind="favicon" isCustom={!!setting?.faviconKey} src={setting?.faviconKey ? withBase(`/media/${setting.faviconKey}-icon-512.png`) : withBase("/img/icon-512.png")} />
              <div className="min-w-0 flex-1 basis-56">
                <SiteNameForm value={setting?.siteName ?? null} fallback={DEFAULT_SITE_NAME} />
              </div>
            </div>
          </div>
          <div className="min-w-0 flex-1 basis-80">
            <h3 className="mb-3 font-semibold text-ink">รูปตอนแชร์ลิงก์ (1200×630)</h3>
            <SiteImageForm kind="og" isCustom={!!setting?.ogImageKey} src={setting?.ogImageKey ? withBase(`/media/${setting.ogImageKey}-og.jpg`) : withBase("/img/hero-960.webp")} />
          </div>
        </div>
      </section>
    </div>
  );
}
