"use client";

import { useEffect, useRef, useState } from "react";

export type NewsItem = {
  id: string;
  title: string;
  summary: string;
  category: string | null;
  linkUrl: string | null;
  date: string; // formatted
  dateTime: string; // ISO
  image: { small: string; large: string } | null;
};

/** News cards (newest first) with category + text filters; a card opens the full story in a popup. */
export function NewsGrid({ items, categories: allCategories }: { items: NewsItem[]; categories: string[] }) {
  // admin order, only categories that have news
  const categories = allCategories.filter((c) => items.some((i) => i.category === c));
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<NewsItem | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const q = query.trim().toLowerCase();
  const shown = items.filter(
    (i) => (!filter || i.category === filter) && (!q || i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q)),
  );
  const chip = (active: boolean) =>
    `shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition ${active ? "bg-primary text-white shadow-brand" : "bg-white text-ink ring-1 ring-line hover:text-primary"}`;

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative md:order-2 md:ml-auto md:w-72 md:shrink-0">
          <span className="sr-only">ค้นหาข่าว</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-body" aria-hidden>
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ค้นหาข่าว" className="field rounded-full py-2 pl-10 text-sm" />
        </label>
        {categories.length > 0 && (
          <div role="group" aria-label="หมวดหมู่ข่าว" className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
            <button type="button" aria-pressed={!filter} onClick={() => setFilter(null)} className={chip(!filter)}>ทั้งหมด</button>
            {categories.map((c) => (
              <button key={c} type="button" aria-pressed={filter === c} onClick={() => setFilter(c)} className={chip(filter === c)}>{c}</button>
            ))}
          </div>
        )}
      </div>

      {shown.length === 0 && <p className="card px-6 py-14 text-center">ไม่พบข่าวที่ตรงกับตัวกรอง</p>}

      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => setOpen(p)}
              className="group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-white text-left shadow-card ring-1 ring-line/70 transition duration-300 hover:-translate-y-1 hover:shadow-brand-lg"
            >
              {p.image && (
                <span className="block aspect-[4/5] overflow-hidden bg-primary-50">
                  <img
                    src={p.image.small}
                    srcSet={`${p.image.small} 640w, ${p.image.large} 1280w`}
                    sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
                    alt=""
                    width={640}
                    height={800}
                    loading={i < 3 ? "eager" : "lazy"}
                    decoding="async"
                    className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                </span>
              )}
              <span className="flex flex-1 flex-col p-5">
                <span className="flex flex-wrap items-center gap-2 text-xs text-body/80">
                  {p.category && <span className="rounded-full bg-primary-50 px-2.5 py-0.5 font-semibold text-primary">{p.category}</span>}
                  <time dateTime={p.dateTime}>{p.date}</time>
                </span>
                <span className="mt-2 text-lg font-semibold text-ink group-hover:text-primary">{p.title}</span>
                {p.summary && <span className="mt-2 line-clamp-3 text-sm whitespace-pre-line">{p.summary}</span>}
                <span className="mt-auto pt-4 text-sm font-semibold text-primary">อ่านรายละเอียด</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        onClose={() => setOpen(null)}
        onClick={(e) => e.target === e.currentTarget && setOpen(null)} // backdrop
        aria-labelledby="news-dialog-title"
        className={`m-auto max-h-[calc(100dvh-24px)] overflow-hidden rounded-3xl bg-white p-0 shadow-2xl backdrop:bg-ink/55 backdrop:backdrop-blur-sm ${
          open?.image ? "w-[min(480px,calc(100vw-24px))] md:w-[min(1040px,calc(100vw-48px))]" : "w-[min(640px,calc(100vw-24px))]"
        }`}
      >
        {open && (
          // phones: one scrolling column; computers: the 4:5 picture fills the left, the text scrolls on the right
          <article className={`max-h-[calc(100dvh-24px)] overflow-y-auto ${open.image ? "md:flex md:overflow-hidden" : ""}`}>
            {open.image && (
              <img
                src={open.image.large}
                alt=""
                className="aspect-[4/5] w-full bg-primary-50 object-cover md:h-[min(calc(100dvh-48px),680px)] md:w-auto md:shrink-0"
              />
            )}
            <div className={`p-6 sm:p-8 ${open.image ? "md:max-h-[min(calc(100dvh-48px),680px)] md:min-w-0 md:flex-1 md:overflow-y-auto" : "pr-16 sm:pr-16"}`}>
              <div className="flex flex-wrap items-center gap-2 text-xs text-body/80 md:pr-10">
                {open.category && <span className="rounded-full bg-primary-50 px-2.5 py-0.5 font-semibold text-primary">{open.category}</span>}
                <time dateTime={open.dateTime}>{open.date}</time>
              </div>
              <h2 id="news-dialog-title" className="mt-3 text-2xl font-bold">{open.title}</h2>
              {open.summary && <p className="mt-4 whitespace-pre-line break-words">{open.summary}</p>}
              {open.linkUrl && (
                <a href={open.linkUrl} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm mt-6">
                  รายละเอียดเพิ่มเติม ↗
                </a>
              )}
            </div>
          </article>
        )}
        {/* top-right corner of the popup, above the picture */}
        <button
          type="button"
          onClick={() => setOpen(null)}
          aria-label="ปิด"
          className="absolute top-3 right-3 z-10 grid size-10 cursor-pointer place-items-center rounded-full bg-white/90 text-ink shadow-card ring-1 ring-line/60 backdrop-blur transition hover:bg-primary hover:text-white"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-5" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </dialog>
    </>
  );
}
