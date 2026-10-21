"use client";

import { startTransition, useActionState, useState } from "react";
import { adminUpdateMember, register } from "@/app/actions/register";
import { CONTACTS, type Contacts } from "@/lib/contacts";
import { currentBuddhistYear, DEPARTMENTS, GRADES, MAX_ROOMS, MAX_STUDENT_NO, NAME_PREFIXES, THAI_MONTHS } from "@/lib/constants";

const range = (from: number, to: number) => Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => (from <= to ? from + i : from - i));

/** Saved profile, or the Google name for a first registration. Numbers are พ.ศ. */
export type ProfileValues = {
  prefix?: string;
  firstName: string;
  lastName: string;
  memberType?: "STUDENT" | "ALUMNI" | "TEACHER";
  grade?: string;
  room?: number;
  studentNo?: number;
  birthDay?: number;
  birthMonth?: number;
  birthYear?: number;
  gradYear?: number;
  department?: string;
  teachGrades?: string[];
  contacts?: Contacts;
};

const str = (v: string | number | undefined) => (v === undefined ? "" : String(v));

/**
 * Registration (first sign-in) and "แก้ไขโปรไฟล์" share this form and the same server action.
 * With `userId`, an admin edits that user instead (/admin/users/[id]).
 */
export function ProfileForm({ next, email, initial, submitLabel, userId }: { next: string; email: string; initial: ProfileValues; submitLabel: string; userId?: string }) {
  const [state, action, pending] = useActionState(userId ? adminUpdateMember : register, null);
  const [type, setType] = useState<"STUDENT" | "ALUMNI" | "TEACHER">(initial.memberType ?? "STUDENT");
  const year = currentBuddhistYear();

  return (
    <form
      // Submitted by hand so a validation error keeps what was typed (form actions reset the form)
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="grid gap-5"
    >
      <input type="hidden" name="next" value={next} />
      {userId && <input type="hidden" name="userId" value={userId} />}
      <p className="rounded-xl bg-primary-50 px-4 py-2.5 text-sm">
        บัญชี <strong className="font-semibold text-ink">{email}</strong>
      </p>

      <div className="grid gap-4 sm:grid-cols-[9rem_1fr_1fr]">
        <label>
          <span className="field-label">คำนำหน้า</span>
          <select name="prefix" required defaultValue={initial.prefix ?? ""} className="field">
            <option value="" disabled>เลือก</option>
            {NAME_PREFIXES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        <label>
          <span className="field-label">ชื่อ</span>
          <input name="firstName" required maxLength={60} defaultValue={initial.firstName} autoComplete="given-name" className="field" />
        </label>
        <label>
          <span className="field-label">นามสกุล</span>
          <input name="lastName" required maxLength={60} defaultValue={initial.lastName} autoComplete="family-name" className="field" />
        </label>
      </div>

      <fieldset>
        <legend className="field-label">สถานะ</legend>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {(
            [
              ["STUDENT", "กำลังศึกษา"],
              ["ALUMNI", "ศิษย์เก่า"],
              ["TEACHER", "ครู"],
            ] as const
          ).map(([v, label]) => (
            <label key={v} className="cursor-pointer">
              <input type="radio" name="memberType" value={v} checked={type === v} onChange={() => setType(v)} className="peer sr-only" />
              <span className="block whitespace-nowrap rounded-xl border-2 border-line bg-white px-1 py-3 text-center text-sm font-semibold sm:text-base text-ink transition peer-checked:border-primary peer-checked:bg-primary-50 peer-checked:text-primary peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20">
                {label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {type === "TEACHER" ? (
        <div key="teacher" className="grid gap-4 motion-safe:animate-rise">
          <label>
            <span className="field-label">กลุ่มสาระการเรียนรู้</span>
            <select name="department" required defaultValue={initial.department ?? ""} className="field">
              <option value="" disabled>เลือก</option>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </label>
          <fieldset>
            <legend className="field-label">ครูผู้สอนระดับชั้น (เลือกได้หลายชั้น)</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {GRADES.map((g) => (
                <label key={g.value} className="cursor-pointer">
                  <input type="checkbox" name="teachGrades" value={g.value} defaultChecked={initial.teachGrades?.includes(g.value)} className="peer sr-only" />
                  <span className="block rounded-xl border-2 border-line bg-white py-2.5 text-center font-semibold text-ink transition peer-checked:border-primary peer-checked:bg-primary-50 peer-checked:text-primary peer-focus-visible:ring-4 peer-focus-visible:ring-primary/20">
                    {g.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ) : type === "STUDENT" ? (
        <div key="student" className="grid grid-cols-3 gap-4 motion-safe:animate-rise">
          <label>
            <span className="field-label">ชั้น</span>
            <select name="grade" required defaultValue={initial.grade ?? ""} className="field">
              <option value="" disabled>เลือก</option>
              {GRADES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </select>
          </label>
          <label>
            <span className="field-label">ห้อง</span>
            <select name="room" required defaultValue={str(initial.room)} className="field">
              <option value="" disabled>เลือก</option>
              {range(1, MAX_ROOMS).map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <label>
            <span className="field-label">เลขที่</span>
            <input name="studentNo" type="number" inputMode="numeric" required min={1} max={MAX_STUDENT_NO} defaultValue={str(initial.studentNo)} className="field" />
          </label>
        </div>
      ) : (
        <div key="alumni" className="grid gap-4 motion-safe:animate-rise">
          <div>
            <span className="field-label">วันเดือนปีเกิด (พ.ศ.)</span>
            <div className="grid grid-cols-3 gap-3 [&_select]:px-3">
              <select name="birthDay" required defaultValue={str(initial.birthDay)} aria-label="วันเกิด" className="field">
                <option value="" disabled>วัน</option>
                {range(1, 31).map((d) => <option key={d}>{d}</option>)}
              </select>
              <select name="birthMonth" required defaultValue={str(initial.birthMonth)} aria-label="เดือนเกิด" className="field">
                <option value="" disabled>เดือน</option>
                {THAI_MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select name="birthYear" required defaultValue={str(initial.birthYear)} aria-label="ปีเกิด (พ.ศ.)" className="field">
                <option value="" disabled>ปี</option>
                {range(year - 10, year - 100).map((y) => <option key={y}>{y}</option>)}
              </select>
            </div>
          </div>
          <label>
            <span className="field-label">ปีการศึกษาที่จบ (พ.ศ.)</span>
            <select name="gradYear" required defaultValue={str(initial.gradYear)} className="field">
              <option value="" disabled>เลือก</option>
              {range(year, year - 80).map((y) => <option key={y}>{y}</option>)}
            </select>
          </label>
        </div>
      )}

      <details open={!!initial.contacts && Object.keys(initial.contacts).length > 0} className="group rounded-2xl border border-line p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-ink [&::-webkit-details-marker]:hidden">
          <span>
            ช่องทางติดต่อ <span className="text-sm font-normal text-body">(ไม่บังคับ)</span>
          </span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5 transition group-open:rotate-180" aria-hidden><path d="m6 9 6 6 6-6" /></svg>
        </summary>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {CONTACTS.map((c) => (
            <label key={c.key} className="flex items-center gap-2 rounded-xl border border-line bg-white px-3 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10">
              <svg viewBox="0 0 24 24" className="size-5 shrink-0 fill-current text-primary" aria-hidden><path d={c.icon} fillRule="evenodd" /></svg>
              <span className="sr-only">{c.label}</span>
              <input
                name={`contact_${c.key}`}
                defaultValue={initial.contacts?.[c.key] ?? ""}
                placeholder={c.placeholder}
                title={c.label}
                maxLength={600}
                inputMode={c.key === "email" ? "email" : c.key === "website" ? "url" : "text"}
                className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-ink outline-none placeholder:text-body/60"
              />
            </label>
          ))}
        </div>
      </details>

      {state && (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">{state.message}</p>
      )}

      <button disabled={pending} className="btn-primary">{pending ? "กำลังบันทึก…" : submitLabel}</button>
    </form>
  );
}
