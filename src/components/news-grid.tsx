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

/** News cards (newest first) with category chips; a card opens the full story in a popup. */
export function NewsGrid({ items }: { items: NewsItem[] }) {
  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[];
  const [filter, setFilter] = useState<string | null>(null);
  const [open, setOpen] = useState<NewsItem | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  const shown = filter ? items.filter((i) => i.category === filter) : items;
  const chip = (active: boolean) =>
    `shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition ${active ? "bg-primary text-white shadow-brand" : "bg-white text-ink ring-1 ring-line hover:text-primary"}`;

  return (
    <>
      {categories.length > 1 && (
        <div role="group" aria-label="หมวดหมู่ข่าว" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          <button type="button" aria-pressed={!filter} onClick={() => setFilter(null)} className={chip(!filter)}>ทั้งหมด</button>
          {categories.map((c) => (
            <button key={c} type="button" aria-pressed={filter === c} onClick={() => setFilter(c)} className={chip(filter === c)}>{c}</button>
          ))}
        </div>
      )}

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
                <span className="mt-2 line-clamp-3 text-sm whitespace-pre-line">{p.summary}</span>
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
        className="m-auto w-[min(640px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-3xl bg-white p-0 shadow-2xl backdrop:bg-ink/55 backdrop:backdrop-blur-sm"
      >
        {open && (
          <article>
            {open.image && <img src={open.image.large} alt="" className="max-h-[60vh] w-full bg-primary-50 object-contain" />}
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-body/80">
                  {open.category && <span className="rounded-full bg-primary-50 px-2.5 py-0.5 font-semibold text-primary">{open.category}</span>}
                  <time dateTime={open.dateTime}>{open.date}</time>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(null)}
                  aria-label="ปิด"
                  className="-mt-1 -mr-1 grid size-9 shrink-0 cursor-pointer place-items-center rounded-full bg-primary-50 text-primary transition hover:bg-primary hover:text-white"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-4" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
                </button>
              </div>
              <h2 id="news-dialog-title" className="mt-3 text-2xl font-bold">{open.title}</h2>
              <p className="mt-4 whitespace-pre-line break-words">{open.summary}</p>
              {open.linkUrl && (
                <a href={open.linkUrl} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm mt-6">
                  ลิงก์แนะนำ ↗
                </a>
              )}
            </div>
          </article>
        )}
      </dialog>
    </>
  );
}
