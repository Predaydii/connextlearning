"use client";

import { useActionState, useState, useTransition } from "react";
import { addBanner, deleteBanner, moveBanner, type ActionState } from "@/app/actions/admin";

type Banner = { id: string; src: string; linkUrl: string | null };

function Notice({ state }: { state: ActionState }) {
  if (!state?.message) return null;
  return <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p>;
}

/** Landing banners: add (image + optional link), reorder, delete. */
export function BannerManager({ banners }: { banners: Banner[] }) {
  const [state, action, pending] = useActionState(addBanner, null);
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <div className="grid gap-6">
      {banners.length > 0 && (
        <ol className="grid gap-3">
          {banners.map((b, i) => (
            <BannerRow key={b.id} banner={b} index={i} last={i === banners.length - 1} />
          ))}
        </ol>
      )}

      <form action={action} onSubmit={() => setPreview(null)} className="grid gap-3 rounded-2xl border border-dashed border-line p-4">
        <p className="font-semibold text-ink">เพิ่มแบนเนอร์</p>
        <div className="grid aspect-[10/3] max-w-2xl place-items-center overflow-hidden rounded-xl bg-primary-50 text-xs ring-1 ring-line">
          {preview ? <img src={preview} alt="" className="size-full object-cover" /> : "ตัวอย่างภาพ 2000×600"}
        </div>
        <input
          type="file"
          name="file"
          required
          accept="image/png,image/jpeg,image/webp"
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
          className="block w-full max-w-2xl cursor-pointer text-xs file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary hover:file:text-white"
        />
        <input name="linkUrl" type="url" maxLength={500} placeholder="ลิงก์เมื่อกดแบนเนอร์ (ไม่บังคับ) https://" className="field max-w-2xl text-sm" />
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={pending} className="btn-primary btn-sm">{pending ? "กำลังอัปโหลด…" : "เพิ่มแบนเนอร์"}</button>
          <Notice state={state} />
        </div>
      </form>
    </div>
  );
}

function BannerRow({ banner, index, last }: { banner: Banner; index: number; last: boolean }) {
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  const btn = "grid size-9 cursor-pointer place-items-center rounded-lg ring-1 ring-line transition hover:bg-primary-50 disabled:opacity-40";
  return (
    <li className="flex flex-col gap-3 rounded-2xl p-3 ring-1 ring-line sm:flex-row sm:items-center">
      <span className="w-6 text-center text-sm font-bold text-primary">{index + 1}</span>
      <img src={banner.src} alt="" className="aspect-[10/3] w-full rounded-lg object-cover sm:w-64" />
      <p className="min-w-0 flex-1 truncate text-sm">{banner.linkUrl ?? <span className="text-body/60">ไม่มีลิงก์</span>}</p>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="เลื่อนขึ้น" disabled={pending || index === 0} onClick={() => start(async () => setState(await moveBanner(banner.id, -1)))} className={btn}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden><path d="m6 15 6-6 6 6" /></svg>
        </button>
        <button type="button" aria-label="เลื่อนลง" disabled={pending || last} onClick={() => start(async () => setState(await moveBanner(banner.id, 1)))} className={btn}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm("ลบแบนเนอร์นี้?")) return;
            start(async () => setState(await deleteBanner(banner.id)));
          }}
          className="btn btn-sm border-red-200 bg-white text-red-600 hover:bg-red-50"
        >
          ลบ
        </button>
      </div>
      <Notice state={state} />
    </li>
  );
}
