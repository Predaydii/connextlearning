"use client";

import { useActionState } from "react";
import { setCoverMode } from "@/app/actions/admin";

const OPTIONS = [
  { value: "SUBJECT", title: "แยกตามวิชา", desc: "แต่ละวิชาใช้ภาพปกของตัวเอง (เลือกเองได้ทีละวิชา)" },
  { value: "UNIFORM", title: "เหมือนกันทั้งหมด", desc: "ทุกชีทใช้ภาพปกเดียวกัน" },
] as const;

export function CoverModeForm({ mode }: { mode: "SUBJECT" | "UNIFORM" }) {
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
        {state && <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p>}
      </div>
    </form>
  );
}
