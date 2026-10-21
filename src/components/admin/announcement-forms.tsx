"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteAnnouncement, sendAnnouncement, setAnnouncementActive, type ActionState } from "@/app/actions/admin";

function Notice({ state }: { state: ActionState }) {
  if (!state) return null;
  return <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p>;
}

export function AnnouncementForm() {
  const [state, action, pending] = useActionState(sendAnnouncement, null);
  return (
    // React resets the (uncontrolled) form after a successful send
    <form action={action} className="grid gap-3">
      <label className="grid gap-1 text-sm font-medium text-ink">
        หัวข้อ
        <input name="title" required maxLength={100} className="field" />
      </label>
      <label className="grid gap-1 text-sm font-medium text-ink">
        ข้อความ <span className="font-normal text-body">(ไม่บังคับ)</span>
        <textarea name="body" maxLength={1000} rows={4} className="field" />
      </label>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <label className="grid gap-1 text-sm font-medium text-ink">
          ลิงก์ <span className="font-normal text-body">(ไม่บังคับ)</span>
          <input name="linkUrl" type="url" maxLength={500} placeholder="https://" className="field" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">
          ชื่อปุ่มลิงก์
          <input name="linkLabel" maxLength={40} placeholder="รายละเอียดเพิ่มเติม" className="field" />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className="btn-primary btn-sm">{pending ? "กำลังส่ง…" : "ส่งประกาศ"}</button>
        <Notice state={state} />
      </div>
    </form>
  );
}

export function AnnouncementRowActions({ id, active }: { id: string; active: boolean }) {
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} onClick={() => start(async () => setState(await setAnnouncementActive(id, !active)))} className="btn-outline btn-sm">
        {active ? "หยุดแสดง" : "แสดงอีกครั้ง"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => confirm("ลบประกาศนี้?") && start(async () => setState(await deleteAnnouncement(id)))}
        className="cursor-pointer rounded-full px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        ลบ
      </button>
      {state && !state.ok && <Notice state={state} />}
    </div>
  );
}
