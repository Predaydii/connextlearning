"use client";

import { useState, useTransition } from "react";
import { addBanner, deleteBanner, moveBanner, type ActionState } from "@/app/actions/admin";
import { MAX_UPLOAD_BYTES, shrinkImage } from "@/lib/shrink-image";
import { ImagePick } from "@/components/admin/image-pick";

type Banner = { id: string; src: string; linkUrl: string | null };

function Notice({ state }: { state: ActionState }) {
  if (!state?.message) return null;
  return <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p>;
}

/** Landing banners: add one or many at once (optional link for all of them), reorder, delete. */
export function BannerManager({ banners }: { banners: Banner[] }) {
  const [state, setState] = useState<ActionState>(null);
  const [pickKey, setPickKey] = useState(0); // remounts the picker after a successful upload
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Each file is shrunk in the browser (Vercel refuses bodies over 4.5 MB) and sent on its own
  function upload(form: HTMLFormElement) {
    const files = (form.elements.namedItem("file") as HTMLInputElement).files;
    const linkUrl = (form.elements.namedItem("linkUrl") as HTMLInputElement).value;
    if (!files?.length) return setState({ ok: false, message: "กรุณาเลือกไฟล์รูปภาพ" });
    const list = Array.from(files);
    start(async () => {
      let done = 0;
      for (const [i, file] of list.entries()) {
        setProgress(`กำลังอัปโหลด ${i + 1}/${list.length}`);
        const small = await shrinkImage(file, 2400);
        if (small.size > MAX_UPLOAD_BYTES) {
          setState({ ok: false, message: `${file.name}: รูปภาพใหญ่เกินไป` });
          continue;
        }
        const fd = new FormData();
        fd.set("file", small);
        fd.set("linkUrl", linkUrl);
        const res = await addBanner(null, fd);
        if (res?.ok) done++;
        else setState(res);
      }
      setProgress(null);
      if (done) {
        setState({ ok: true, message: `เพิ่มแบนเนอร์แล้ว ${done} รูป` });
        form.reset();
        setPickKey((k) => k + 1);
      }
    });
  }

  return (
    <div className="grid gap-6">
      {banners.length > 0 && (
        <ol className="grid gap-3">
          {banners.map((b, i) => (
            <BannerRow key={b.id} banner={b} index={i} last={i === banners.length - 1} />
          ))}
        </ol>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          upload(e.currentTarget);
        }}
        className="grid gap-3 rounded-2xl border border-dashed border-line p-4"
      >
        <p className="font-semibold text-ink">เพิ่มแบนเนอร์ <span className="text-sm font-normal text-body">(เลือกได้หลายรูปพร้อมกัน)</span></p>
        <ImagePick
          key={pickKey}
          aspect="aspect-[10/3]"
          className="max-w-2xl"
          multiple
          required
          placeholder="คลิกเพื่อเลือกรูป 2000×600 (เลือกได้หลายรูป)"
        />
        <input name="linkUrl" type="url" maxLength={500} placeholder="ลิงก์เมื่อกดแบนเนอร์ (ไม่บังคับ) https://" className="field max-w-2xl text-sm" />
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={pending} className="btn-primary btn-sm">{pending ? (progress ?? "กำลังอัปโหลด…") : "เพิ่มแบนเนอร์"}</button>
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
