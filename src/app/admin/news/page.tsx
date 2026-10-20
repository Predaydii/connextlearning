import { NewsPostForm, NewsPostRow } from "@/components/admin/news-forms";
import { VideoUploader } from "@/components/admin/video-uploader";
import { db } from "@/lib/db";
import { customCover, videoUrl } from "@/lib/covers";
import { formatThaiDate } from "@/lib/format";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "ข่าวสาร" };

export default async function AdminNewsPage() {
  await requireAdminPage("/news");
  const [setting, posts] = await Promise.all([
    db.siteSetting.findUnique({ where: { id: 1 }, select: { newsVideoKey: true } }),
    db.newsPost.findMany({ orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }] }),
  ]);

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h2 className="text-lg font-semibold">วิดีโอเด่น</h2>
        <p className="mb-5 text-sm">แสดงขนาด 16:9 ที่ด้านบนของหน้าข่าวสาร</p>
        <VideoUploader slot="news" src={setting?.newsVideoKey ? videoUrl(setting.newsVideoKey) : null} />
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-lg font-semibold">เพิ่มข่าว</h2>
        <NewsPostForm />
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-lg font-semibold">ข่าวทั้งหมด ({posts.length})</h2>
        {posts.length === 0 ? (
          <p className="text-sm">ยังไม่มีข่าว</p>
        ) : (
          <ul className="grid gap-3">
            {posts.map((p) => (
              <NewsPostRow
                key={`${p.id}-${p.updatedAt.getTime()}`}
                date={formatThaiDate(p.publishedAt)}
                post={{
                  id: p.id,
                  title: p.title,
                  summary: p.summary,
                  linkUrl: p.linkUrl,
                  image: p.imageKey ? customCover(p.imageKey).small : null,
                  publishedAt: p.publishedAt.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }),
                }}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
