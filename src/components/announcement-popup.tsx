"use client";

import { useEffect, useRef } from "react";

type Announcement = { id: string; title: string; body: string; linkUrl: string | null; linkLabel: string | null };

const SEEN_KEY = "seen-announcement";

/** Admin message, shown once per browser until a newer one is sent. */
export function AnnouncementPopup({ announcement: a }: { announcement: Announcement }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(SEEN_KEY) === a.id) return;
    } catch {}
    dialog.current?.showModal();
    // The browser would focus (and ring) the close button; focus the message instead
    box.current?.focus();
  }, [a.id]);

  const close = () => dialog.current?.close();

  return (
    <dialog
      ref={dialog}
      onClose={() => {
        try {
          localStorage.setItem(SEEN_KEY, a.id);
        } catch {}
      }}
      onClick={(e) => e.target === e.currentTarget && close()} // backdrop
      aria-labelledby="announcement-title"
      className="m-auto w-[min(520px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] overflow-hidden rounded-3xl bg-white p-0 shadow-2xl backdrop:bg-ink/55 backdrop:backdrop-blur-sm"
    >
      <div ref={box} tabIndex={-1} className="max-h-[calc(100dvh-24px)] overflow-y-auto p-6 outline-none sm:p-8">
        <p className="w-fit rounded-full bg-primary-50 px-3 py-0.5 text-xs font-semibold text-primary">ประกาศ</p>
        <h2 id="announcement-title" className="mt-3 pr-8 text-2xl font-bold">{a.title}</h2>
        {a.body && <p className="mt-3 whitespace-pre-line break-words">{a.body}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          {a.linkUrl && (
            <a href={a.linkUrl} target="_blank" rel="noopener noreferrer" onClick={close} className="btn-primary btn-sm">
              {a.linkLabel || "รายละเอียดเพิ่มเติม"} ↗
            </a>
          )}
          <button type="button" onClick={close} className="btn-outline btn-sm">รับทราบ</button>
        </div>
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="ปิด"
        className="absolute top-3 right-3 grid size-10 cursor-pointer place-items-center rounded-full text-ink transition hover:bg-primary-50 hover:text-primary"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-5" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </dialog>
  );
}
