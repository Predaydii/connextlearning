"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { approveSheet, deleteSheet, rejectSheet, updateCover, type ActionState } from "@/app/actions/admin";
import { adminHref } from "@/lib/urls";

function Notice({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p role="status" className={`rounded-xl px-3 py-2 text-sm ring-1 ${state.ok ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-red-50 text-red-700 ring-red-200"}`}>
      {state.message}
    </p>
  );
}

const Spinner = () => <span className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden />;

export function ApproveButton({ id, label = "อนุมัติและเผยแพร่" }: { id: string; label?: string }) {
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setState(await approveSheet(id)))}
        className="btn w-full border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {pending && <Spinner />}
        {pending ? "กำลังเผยแพร่…" : label}
      </button>
      <Notice state={state} />
    </div>
  );
}

export function RejectForm({ id, defaultReason }: { id: string; defaultReason?: string | null }) {
  const [state, action, pending] = useActionState(rejectSheet, null);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="id" value={id} />
      <label htmlFor="reject-reason" className="field-label">เหตุผลที่ไม่อนุมัติ (ผู้ส่งจะเห็นข้อความนี้)</label>
      <textarea id="reject-reason" name="reason" required minLength={3} maxLength={500} rows={3} defaultValue={defaultReason ?? ""} className="field text-sm" placeholder="เช่น เนื้อหาไม่ตรงกับวิชาที่เลือก / ไฟล์อ่านไม่ออก" />
      <button disabled={pending} className="btn w-full border-red-500 bg-white text-red-600 hover:bg-red-50">
        {pending && <Spinner />}
        ไม่อนุมัติ
      </button>
      <Notice state={state} />
    </form>
  );
}

export function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("ลบชีทนี้ถาวร? ไฟล์ใน Google Drive และข้อมูลทั้งหมดจะถูกลบ")) return;
          start(async () => {
            const res = await deleteSheet(id);
            setState(res);
            if (res?.ok) router.push(adminHref("/sheets"));
          });
        }}
        className="w-full cursor-pointer rounded-full py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "กำลังลบ…" : "ลบชีทถาวร"}
      </button>
      <Notice state={state} />
    </div>
  );
}

/** Upload a 16:9 cover for a target ("uniform", a subject id, or "sheet:<id>"), or reset it. */
export function CoverUploader({
  target,
  src,
  title,
  isCustom,
  compact = false,
}: {
  target: string;
  src: string;
  title: string;
  isCustom: boolean;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState(updateCover, null);
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <form action={action} className="grid gap-3" onSubmit={() => setPreview(null)}>
      <input type="hidden" name="target" value={target} />
      <div className="relative overflow-hidden rounded-xl bg-primary-50 ring-1 ring-line">
        <img src={preview ?? src} alt={`ภาพปก ${title}`} width={640} height={360} className="aspect-video w-full object-cover" />
        <span className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${isCustom ? "bg-primary text-white" : "bg-white/90 text-ink"}`}>
          {preview ? "ตัวอย่าง (ยังไม่บันทึก)" : isCustom ? "ภาพที่ตั้งค่าไว้" : "ภาพเริ่มต้น"}
        </span>
      </div>
      {!compact && <p className="font-medium text-ink">{title}</p>}
      <input
        type="file"
        name="file"
        accept="image/png,image/jpeg,image/webp"
        className="block w-full cursor-pointer text-xs file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-primary hover:file:bg-primary hover:file:text-white"
        onChange={(e) => {
          const f = e.target.files?.[0];
          setPreview(f ? URL.createObjectURL(f) : null);
        }}
      />
      <div className="flex gap-2">
        <button disabled={pending || !preview} className="btn-primary btn-sm flex-1">
          {pending ? "กำลังบันทึก…" : "บันทึกภาพ"}
        </button>
        {isCustom && (
          <button name="reset" value="1" disabled={pending} formNoValidate className="btn-outline btn-sm">
            ใช้ภาพเริ่มต้น
          </button>
        )}
      </div>
      <Notice state={state} />
    </form>
  );
}
