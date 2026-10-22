"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useTransition } from "react";
import { deleteAnnouncement, sendAnnouncement, setAnnouncementActive, type ActionState } from "@/app/actions/admin";

function Notice({ state }: { state: ActionState }) {
  if (!state) return null;
  return <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p>;
}

export function AnnouncementForm() {
  const [state, action, pending] = useActionState(sendAnnouncement, null);
  const form = useRef<HTMLFormElement>(null);
  // Cleared only after a send that worked; an error keeps the title, message and email list
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);
  return (
    <form
      ref={form}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="grid gap-3"
    >
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
      {/* the email box shows only for "เลือกผู้ใช้" (CSS :has, so it also resets with the form) */}
      <fieldset className="group grid gap-2">
        <legend className="mb-1 text-sm font-medium text-ink">ผู้รับ</legend>
        <div className="flex flex-wrap gap-2">
          {[
            ["all", "ทุกคนที่เปิดเว็บ"],
            ["users", "เลือกผู้ใช้"],
          ].map(([value, label]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 ring-line has-checked:bg-primary-50 has-checked:text-primary has-checked:ring-primary">
              <input type="radio" name="audience" value={value} defaultChecked={value === "all"} className="accent-primary" />
              {label}
            </label>
          ))}
        </div>
        <label className="hidden gap-1 text-sm font-medium text-ink group-has-[input[value=users]:checked]:grid">
          อีเมลผู้รับ
          <textarea name="emails" rows={3} maxLength={20000} placeholder={"name@tkschool.ac.th\nบรรทัดละคน หรือคั่นด้วยจุลภาค"} className="field font-normal" />
          <span className="text-xs font-normal text-body">คัดลอกอีเมลได้จากหน้าผู้ใช้งาน · ผู้รับต้องเข้าสู่ระบบจึงจะเห็น</span>
        </label>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-ink">
          เริ่มแสดง <span className="font-normal text-body">(เว้นว่าง = ทันที)</span>
          <input name="startsAt" type="datetime-local" className="field" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-ink">
          สิ้นสุด <span className="font-normal text-body">(เว้นว่าง = จนกว่าจะกดหยุด)</span>
          <input name="endsAt" type="datetime-local" className="field" />
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
