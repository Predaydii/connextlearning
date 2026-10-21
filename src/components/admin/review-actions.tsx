"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { approveSheet, deleteSheet, hideSheet, rejectSheet, updateCover, updateSheetDetails, type ActionState } from "@/app/actions/admin";
import { shrinkInForm } from "@/lib/shrink-image";
import { ImagePick } from "@/components/admin/image-pick";
import { ACADEMIC_YEARS, GRADES, SEMESTERS, SUBJECTS, DESCRIPTION_MAX, TITLE_MAX } from "@/lib/constants";

function Notice({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p role="status" className={`rounded-xl px-3 py-2 text-sm ring-1 ${state.ok ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-red-50 text-red-700 ring-red-200"}`}>
      {state.message}
    </p>
  );
}

const Spinner = () => <span className="size-4 animate-spin rounded-full border-2 border-current/30 border-t-current" aria-hidden />;

/** `nextHref`: where to go once it worked (the next sheet waiting for review, or the queue). */
export function ApproveButton({ id, label = "อนุมัติและเผยแพร่", nextHref }: { id: string; label?: string; nextHref?: string }) {
  const router = useRouter();
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await approveSheet(id);
            setState(res);
            if (res?.ok && nextHref) router.push(nextHref);
          })
        }
        className="btn w-full border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
      >
        {pending && <Spinner />}
        {pending ? "กำลังเผยแพร่…" : label}
      </button>
      <Notice state={state} />
    </div>
  );
}

/** Published sheet: take it off the public site (stays in the admin area; "approve" shows it again). */
export function HideButton({ id }: { id: string }) {
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setState(await hideSheet(id)))}
        className="btn w-full border-slate-400 bg-white text-slate-700 hover:bg-slate-50"
      >
        {pending && <Spinner />}
        ไม่แสดงสาธารณะ
      </button>
      <Notice state={state} />
    </div>
  );
}

export type SheetDetails = {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  grade: string;
  semester: number;
  academicYear: number;
};

/** Everything the sender chose, editable by admins. */
export function SheetDetailsForm({ sheet }: { sheet: SheetDetails }) {
  const [state, action, pending] = useActionState(updateSheetDetails, null);
  const [subjectId, setSubjectId] = useState(sheet.subjectId);
  const levels = SUBJECTS.find((s) => s.id === subjectId)?.levels;
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="id" value={sheet.id} />
      <label className="sm:col-span-2">
        <span className="field-label">ชื่อชีท</span>
        <input name="title" required maxLength={TITLE_MAX} defaultValue={sheet.title} className="field text-sm" />
      </label>
      <label>
        <span className="field-label">วิชา</span>
        <select name="subjectId" required value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="field text-sm">
          {SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <label>
        <span className="field-label">ระดับชั้น</span>
        <select name="grade" required defaultValue={sheet.grade} key={subjectId} className="field text-sm">
          {GRADES.filter((g) => !levels || levels.includes(g.value)).map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
        </select>
      </label>
      <label>
        <span className="field-label">ภาคเรียน</span>
        <select name="semester" required defaultValue={sheet.semester} className="field text-sm">
          {SEMESTERS.map((s) => <option key={s} value={s}>ภาคเรียนที่ {s}</option>)}
        </select>
      </label>
      <label>
        <span className="field-label">ปีการศึกษา</span>
        <select name="academicYear" required defaultValue={sheet.academicYear} className="field text-sm">
          {ACADEMIC_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
      <label className="sm:col-span-2">
        <span className="field-label">คำอธิบาย</span>
        <textarea name="description" required maxLength={DESCRIPTION_MAX} rows={4} defaultValue={sheet.description} className="field text-sm" />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="btn-primary btn-sm">{pending ? "กำลังบันทึก…" : "บันทึกรายละเอียด"}</button>
        <Notice state={state} />
      </div>
    </form>
  );
}

export function RejectForm({ id, defaultReason, nextHref }: { id: string; defaultReason?: string | null; nextHref?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(rejectSheet, null);
  useEffect(() => {
    if (state?.ok && nextHref) router.push(nextHref);
  }, [state, nextHref, router]);
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
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("ลบชีทนี้ถาวร? ไฟล์ PDF และข้อมูลทั้งหมดจะถูกลบ")) return;
          // On success the action redirects to the list; only errors come back
          start(async () => setState(await deleteSheet(id)));
        }}
        className="w-full cursor-pointer rounded-full py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "กำลังลบ…" : "ลบชีทถาวร"}
      </button>
      <Notice state={state} />
    </div>
  );
}

/** Upload a 16:9 cover for a target ("uniform", a subject id, "sheet:<id>"), or a 4:5 landing tile ("grade:<n>"), or reset it. */
export function CoverUploader({
  target,
  src,
  title,
  isCustom,
  compact = false,
  portrait = false,
}: {
  target: string;
  src: string;
  title: string;
  isCustom: boolean;
  compact?: boolean;
  portrait?: boolean;
}) {
  // Shrink big photos in the browser first (Vercel refuses bodies over 4.5 MB)
  const [state, action, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const err = await shrinkInForm(fd);
    return err ? { ok: false, message: err } : updateCover(prev, fd);
  }, null);
  const [picked, setPicked] = useState(false);

  return (
    <form action={action} className="@container grid gap-3" onSubmit={() => setPicked(false)}>
      <input type="hidden" name="target" value={target} />
      {/* click the picture to choose a new one */}
      <ImagePick
        key={src}
        src={src}
        alt={`ภาพ ${title}`}
        aspect={portrait ? "aspect-[4/5]" : "aspect-video"}
        onPick={(files) => setPicked(files.length > 0)}
        badge={(p) => (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p || isCustom ? "bg-primary text-white" : "bg-white/90 text-ink"}`}>
            {p ? "ตัวอย่าง (ยังไม่บันทึก)" : isCustom ? "ภาพที่ตั้งค่าไว้" : "ภาพเริ่มต้น"}
          </span>
        )}
      />
      {!compact && <p className="font-medium text-ink">{title}</p>}
      {/* narrow tiles (two per row on phones) stack the buttons */}
      <div className="flex flex-col gap-2 @[260px]:flex-row">
        <button disabled={pending || !picked} className="btn-primary btn-sm flex-1 whitespace-nowrap">
          {pending ? "กำลังบันทึก…" : "บันทึกภาพ"}
        </button>
        {/* not name="reset": that would hide form.reset(), which React calls after every action */}
        {isCustom && (
          <button name="useDefault" value="1" disabled={pending} formNoValidate className="btn-outline btn-sm whitespace-nowrap">
            ใช้ภาพเริ่มต้น
          </button>
        )}
      </div>
      <Notice state={state} />
    </form>
  );
}
