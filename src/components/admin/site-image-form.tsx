"use client";

import { useActionState, useState } from "react";
import { setSiteImage, type ActionState } from "@/app/actions/admin";
import { ImagePick } from "@/components/admin/image-pick";
import { shrinkInForm } from "@/lib/shrink-image";

/** Favicon (square) or link-preview image (1200×630): click the picture to replace it. */
export function SiteImageForm({ kind, src, isCustom }: { kind: "favicon" | "og"; src: string; isCustom: boolean }) {
  const [state, action, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const err = await shrinkInForm(fd);
    return err ? { ok: false, message: err } : setSiteImage(prev, fd);
  }, null);
  const [picked, setPicked] = useState(false);
  const icon = kind === "favicon";

  return (
    <form action={action} onSubmit={() => setPicked(false)} className="grid content-start gap-3">
      <input type="hidden" name="kind" value={kind} />
      <ImagePick
        key={src}
        src={src}
        aspect={icon ? "aspect-square" : "aspect-[1200/630]"}
        className={icon ? "w-32" : "max-w-md"}
        onPick={(f) => setPicked(f.length > 0)}
        badge={(p) => (
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${p || isCustom ? "bg-primary text-white" : "bg-white/90 text-ink"}`}>
            {p ? "ตัวอย่าง" : isCustom ? "ตั้งค่าแล้ว" : "ค่าเริ่มต้น"}
          </span>
        )}
      />
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={pending || !picked} className="btn-primary btn-sm">{pending ? "กำลังบันทึก…" : "บันทึก"}</button>
        {isCustom && (
          <button name="reset" value="1" disabled={pending} formNoValidate className="btn-outline btn-sm">ใช้ค่าเริ่มต้น</button>
        )}
      </div>
      {state?.message && <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>{state.message}</p>}
    </form>
  );
}
