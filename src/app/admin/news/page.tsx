import { NewsCategoryManager, NewsPostForm, NewsPostRow } from "@/components/admin/news-forms";
import { db } from "@/lib/db";
import { customCover } from "@/lib/covers";
import { formatThaiDate } from "@/lib/format";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "ข่าวสาร" };

export default async function AdminNewsPage() {
  await requireAdminPage("/news");
  const [posts, cats] = await Promise.all([
    db.newsPost.findMany({ orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }] }),
    db.newsCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  const categories = cats.map((c) => c.name);
  const counts = new Map<string, number>();
  for (const p of posts) if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h2 className="text-lg font-semibold">หมวดหมู่ข่าว</h2>
        <p className="mb-4 text-sm">คลิกชื่อเพื่อเปลี่ยนชื่อ · ลบแล้วข่าวในหมวดนั้นจะไม่มีหมวดหมู่</p>
        <NewsCategoryManager categories={cats.map((c) => ({ id: c.id, name: c.name, count: counts.get(c.name) ?? 0 }))} />
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-lg font-semibold">เพิ่มข่าว</h2>
        <NewsPostForm categories={categories} />
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
                categories={categories}
                post={{
                  id: p.id,
                  title: p.title,
                  summary: p.summary,
                  linkUrl: p.linkUrl,
                  linkLabel: p.linkLabel,
                  category: p.category,
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
