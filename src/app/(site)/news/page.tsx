import type { Metadata } from "next";
import { getInstagramPosts, INSTAGRAM_PROFILE_URL, INSTAGRAM_USERNAME } from "@/lib/instagram";
import { customCover } from "@/lib/covers";
import { formatThaiDate } from "@/lib/format";
import { getNews } from "@/lib/queries";
import { NewsGrid } from "@/components/news-grid";

export const metadata: Metadata = {
  title: "ข่าวสารการศึกษา",
  description: "ข่าวสารและกิจกรรมการศึกษาล่าสุดจาก Connext Learning",
};

// Rendered per request (no DB access at build time); data is cached in getNews / getInstagramPosts
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const [{ posts, categories }, igPosts] = await Promise.all([getNews(), getInstagramPosts()]);
  const empty = posts.length === 0 && !igPosts?.length;

  return (
    <div className="container-page py-10 md:py-14">
      <h1 className="mb-8 text-[clamp(1.6rem,3vw,2.2rem)] font-bold">ข่าวสารการศึกษา</h1>

      {empty && (
        <div className="card grid place-items-center px-6 py-20 text-center">
          <p className="text-lg font-semibold text-ink">ยังไม่มีข่าวสารในขณะนี้</p>
          <p className="mt-1 text-sm">โปรดกลับมาติดตามอีกครั้งเร็ว ๆ นี้</p>
        </div>
      )}

      {posts.length > 0 && (
        <NewsGrid
          categories={categories}
          items={posts.map((p) => ({
            id: p.id,
            title: p.title,
            summary: p.summary,
            category: p.category,
            linkUrl: p.linkUrl,
            date: formatThaiDate(p.publishedAt),
            dateTime: p.publishedAt,
            image: p.imageKey ? customCover(p.imageKey) : null,
          }))}
        />
      )}

      {igPosts && igPosts.length > 0 && (
        <section className="mt-14">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-xl font-bold">จาก Instagram</h2>
            <a
              href={INSTAGRAM_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink shadow-card ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-brand"
            >
              <InstagramIcon className="size-5 text-[#d6249f]" />@{INSTAGRAM_USERNAME}
            </a>
          </div>
          <ul className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3">
            {igPosts.map((p) => (
              <li key={p.id}>
                <a
                  href={p.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/70 transition duration-300 hover:-translate-y-1 hover:shadow-brand-lg"
                >
                  <div className="relative aspect-square overflow-hidden bg-primary-50">
                    <img
                      src={p.image}
                      alt={p.caption.slice(0, 120) || `โพสต์จาก @${INSTAGRAM_USERNAME}`}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                    {(p.isVideo || p.isAlbum) && (
                      <span className="absolute top-3 right-3 rounded-full bg-ink/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur">
                        {p.isVideo ? "วิดีโอ" : "หลายภาพ"}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-4 sm:p-5">
                    <p className="line-clamp-3 text-sm whitespace-pre-line text-ink">{p.caption}</p>
                    <time dateTime={p.timestamp} className="mt-auto pt-3 text-xs text-body/80">{formatThaiDate(p.timestamp)}</time>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`fill-current ${className ?? ""}`} aria-hidden>
      <path fillRule="evenodd" d="M7.6 2h8.8A5.6 5.6 0 0 1 22 7.6v8.8a5.6 5.6 0 0 1-5.6 5.6H7.6A5.6 5.6 0 0 1 2 16.4V7.6A5.6 5.6 0 0 1 7.6 2zm-.2 2A3.4 3.4 0 0 0 4 7.4v9.2A3.4 3.4 0 0 0 7.4 20h9.2a3.4 3.4 0 0 0 3.4-3.4V7.4A3.4 3.4 0 0 0 16.6 4zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.3-3.6a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6z" />
    </svg>
  );
}
