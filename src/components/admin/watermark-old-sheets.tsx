"use client";

import { useActionState } from "react";
import { watermarkOldSheets } from "@/app/actions/admin";

/** Sheets uploaded before the watermark existed: rewritten a few per click. */
export function WatermarkOldSheets({ count }: { count: number }) {
  const [state, action, pending] = useActionState(watermarkOldSheets, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm ring-1 ring-amber-200">
      <span className="text-amber-900">มี {count} ชีทที่อัปโหลดก่อนมีลายน้ำ</span>
      <button disabled={pending} className="btn-outline btn-sm">{pending ? "กำลังใส่ลายน้ำ…" : "ใส่ลายน้ำให้ชีทเก่า"}</button>
      {state && <span role="status" className={state.ok ? "text-emerald-700" : "text-red-600"}>{state.message}</span>}
    </form>
  );
}
