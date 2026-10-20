import type { Metadata } from "next";
import { getInstagramPosts, INSTAGRAM_PROFILE_URL, INSTAGRAM_USERNAME } from "@/lib/instagram";
import { customCover, videoUrl } from "@/lib/covers";
import { formatThaiDate } from "@/lib/format";
import { getNews } from "@/lib/queries";

export const metadata: Metadata = {
  title: "ข่าวสารการศึกษา",
  description: "ข่าวสารและกิจกรรมการศึกษาล่าสุดจาก Connext Learning",
};

// Rendered per request (no DB access at build time); data is cached in getNews / getInstagramPosts
export const dynamic = "force-dynamic";

export default async function NewsPage() {
  const [{ videoKey, posts }, igPosts] = await Promise.all([getNews(), getInstagramPosts()]);
  const empty = !videoKey && posts.length === 0 && !igPosts?.length;

  return (
    <div className="container-page py-10 md:py-14">
      <h1 className="mb-8 text-[clamp(1.6rem,3vw,2.2rem)] font-bold">ข่าวสารการศึกษา</h1>

      {empty && (
        <div className="card grid place-items-center px-6 py-20 text-center">
          <p className="text-lg font-semibold text-ink">ยังไม่มีข่าวสารในขณะนี้</p>
          <p className="mt-1 text-sm">โปรดกลับมาติดตามอีกครั้งเร็ว ๆ นี้</p>
        </div>
      )}

      {videoKey && (
        <video
          src={videoUrl(videoKey)}
          controls
          playsInline
          preload="metadata"
          className="mx-auto mb-10 aspect-video w-full max-w-5xl rounded-2xl bg-ink shadow-card ring-1 ring-line/60"
        />
      )}

      {posts.length > 0 && (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((p, i) => {
            const body = (
              <>
                {p.imageKey && (
                  <div className="aspect-video overflow-hidden bg-primary-50">
                    <img
                      src={customCover(p.imageKey).small}
                      srcSet={`${customCover(p.imageKey).small} 640w, ${customCover(p.imageKey).large} 1280w`}
                      sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                      alt=""
                      width={640}
                      height={360}
                      loading={i < 3 ? "eager" : "lazy"}
                      decoding="async"
                      className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <time dateTime={p.publishedAt} className="text-xs text-body/80">{formatThaiDate(p.publishedAt)}</time>
                  <h2 className="mt-1 text-lg font-semibold text-ink group-hover:text-primary">{p.title}</h2>
                  <p className="mt-2 line-clamp-4 text-sm whitespace-pre-line">{p.summary}</p>
                  {p.linkUrl && <span className="mt-auto pt-4 text-sm font-semibold text-primary">อ่านต่อ</span>}
                </div>
              </>
            );
            const cls = "group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-line/70";
            return (
              <li key={p.id}>
                {p.linkUrl ? (
                  <a
                    href={p.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${cls} transition duration-300 hover:-translate-y-1 hover:shadow-brand-lg`}
                  >
                    {body}
                  </a>
                ) : (
                  <article className={cls}>{body}</article>
                )}
              </li>
            );
          })}
        </ul>
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
      <path d="M12 7.3A4.7 4.7 0 1 0 16.7 12 4.7 4.7 0 0 0 12 7.3zm0 7.7a3 3 0 1 1 3-3 3 3 0 0 1-3 3zm6-7.9a1.1 1.1 0 1 1-1.1-1.1A1.1 1.1 0 0 1 18 7.1zM21 8.1a5.4 5.4 0 0 0-1.5-3.8A5.4 5.4 0 0 0 15.8 3C14.3 2.9 9.7 2.9 8.2 3a5.4 5.4 0 0 0-3.8 1.5A5.4 5.4 0 0 0 3 8.2c-.1 1.5-.1 6.1 0 7.6a5.4 5.4 0 0 0 1.5 3.8A5.4 5.4 0 0 0 8.2 21c1.5.1 6.1.1 7.6 0a5.4 5.4 0 0 0 3.8-1.5 5.4 5.4 0 0 0 1.5-3.8c0-1.5 0-6.1-.1-7.6z" />
    </svg>
  );
}
