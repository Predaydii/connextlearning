"use client";

import { useActionState } from "react";
import { makeMissingPageCovers, setCoverMode } from "@/app/actions/admin";

const OPTIONS = [
  { value: "SUBJECT", title: "ภาพปกที่ตั้งไว้", desc: "แต่ละวิชาใช้ภาพปกของตัวเอง (เปลี่ยนได้ด้านล่าง)" },
  { value: "FIRST_PAGE", title: "หน้าแรกของชีท", desc: "แสดงส่วนบนของหน้าแรกในไฟล์ที่ผู้จัดทำอัปโหลด" },
] as const;

function Status({ state }: { state: { ok: boolean; message: string } | null }) {
  return state && <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p>;
}

export function CoverModeForm({ mode }: { mode: "SUBJECT" | "FIRST_PAGE" }) {
  const [state, action, pending] = useActionState(setCoverMode, null);
  return (
    <form action={action} className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input type="radio" name="mode" value={o.value} defaultChecked={mode === o.value} className="peer sr-only" />
            <span className="block h-full rounded-2xl border-2 border-line bg-white p-4 transition peer-checked:border-primary peer-checked:bg-primary-50 peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20">
              <span className="block font-semibold text-ink">{o.title}</span>
              <span className="mt-1 block text-sm">{o.desc}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="btn-primary btn-sm">{pending ? "กำลังบันทึก…" : "บันทึกรูปแบบภาพปก"}</button>
        <Status state={state} />
      </div>
    </form>
  );
}

/** Older sheets have no first-page image yet; drawn in small batches. */
export function MissingPageCovers({ count }: { count: number }) {
  const [state, action, pending] = useActionState(makeMissingPageCovers, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm ring-1 ring-amber-200">
      <span className="text-amber-900">มี {count} ชีทที่ยังไม่มีภาพหน้าแรก (จะแสดงภาพปกวิชาแทน)</span>
      <button disabled={pending} className="btn-outline btn-sm">{pending ? "กำลังสร้างภาพ…" : "สร้างภาพหน้าแรก"}</button>
      <Status state={state} />
    </form>
  );
}
