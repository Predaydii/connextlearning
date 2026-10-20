"use client";

import { useActionState, useState, useTransition } from "react";
import { addAdmin, removeAdmin, type ActionState } from "@/app/actions/admin";
import { SCHOOL_DOMAIN } from "@/lib/constants";

function Notice({ state }: { state: ActionState }) {
  if (!state) return null;
  return <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p>;
}

export function AddAdminForm() {
  const [state, action, pending] = useActionState(addAdmin, null);
  return (
    <form action={action} className="grid max-w-xl gap-3">
      <label className="field-label" htmlFor="admin-email">อีเมลโรงเรียน</label>
      <div className="flex flex-wrap gap-3">
        <input id="admin-email" name="email" type="email" required placeholder={`12345@${SCHOOL_DOMAIN}`} className="field min-w-0 flex-1" />
        <button disabled={pending} className="btn-primary btn-sm">{pending ? "กำลังเพิ่ม…" : "เพิ่มผู้ดูแล"}</button>
      </div>
      <Notice state={state} />
    </form>
  );
}

export function RemoveAdminButton({ id, name }: { id: string; name: string }) {
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-3">
      {state && !state.ok && <Notice state={state} />}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm(`ถอดสิทธิ์ผู้ดูแลของ ${name}?`)) return;
          start(async () => setState(await removeAdmin(id)));
        }}
        className="btn btn-sm border-red-200 bg-white text-red-600 hover:bg-red-50"
      >
        {pending ? "กำลังถอด…" : "ถอดสิทธิ์"}
      </button>
    </div>
  );
}
