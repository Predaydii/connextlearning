"use client";

import { useActionState, useState, useTransition } from "react";
import { addComment, deleteComment, rateSheet, type ActionState } from "@/app/actions/community";
import { COMMENT_MAX } from "@/lib/constants";

function StarIcon({ filled, className = "size-5" }: { filled: number; className?: string }) {
  // filled: 0 (empty) … 1 (full); fractions draw a partly filled star
  const pct = Math.round(Math.max(0, Math.min(1, filled)) * 100);
  const path = "M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z";
  return (
    <span className={`relative inline-block ${className}`} aria-hidden>
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-full text-amber-200" fill="currentColor"><path d={path} /></svg>
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-full text-amber-400" fill="currentColor" style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}>
        <path d={path} />
      </svg>
    </span>
  );
}

/** Read-only stars, e.g. "★★★★☆ 4.2 (12)". */
export function Stars({ average, count, size = "size-4" }: { average: number; count: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-1" title={count ? `คะแนนเฉลี่ย ${average.toFixed(1)} จาก ${count} คน` : "ยังไม่มีคะแนน"}>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <StarIcon key={n} filled={average - (n - 1)} className={size} />
        ))}
      </span>
      <span className="text-sm font-medium text-ink">{count ? average.toFixed(1) : "–"}</span>
      <span className="text-xs">({count})</span>
    </span>
  );
}

function Notice({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p role="status" className={`text-sm ${state.ok ? "text-emerald-700" : "text-red-600"}`}>
      {state.message}
    </p>
  );
}

/** Clickable 1–5 stars for a signed-in reader who isn't the author. */
export function RateSheet({ sheetId, myScore }: { sheetId: string; myScore: number | null }) {
  const [score, setScore] = useState(myScore);
  const [hover, setHover] = useState<number | null>(null);
  const [state, setState] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  const shown = hover ?? score ?? 0;

  const rate = (n: number) =>
    start(async () => {
      const prev = score;
      setScore(n);
      const res = await rateSheet(sheetId, n);
      if (!res?.ok) setScore(prev);
      setState(res);
    });

  return (
    <div className="grid gap-1">
      <div role="radiogroup" aria-label="ให้คะแนนชีทนี้" className="flex" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={score === n}
            aria-label={`${n} ดาว`}
            disabled={pending}
            onMouseEnter={() => setHover(n)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(null)}
            onClick={() => rate(n)}
            className="cursor-pointer rounded-md p-0.5 transition hover:scale-110 disabled:cursor-wait"
          >
            <StarIcon filled={shown >= n ? 1 : 0} className="size-7" />
          </button>
        ))}
      </div>
      <Notice state={state} />
    </div>
  );
}

export function CommentForm({ sheetId }: { sheetId: string }) {
  // Controlled so the text survives a failed submit; cleared only once it is sent
  const [body, setBody] = useState("");
  const [state, action, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const res = await addComment(prev, formData);
    if (res?.ok) setBody("");
    return res;
  }, null);

  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="sheetId" value={sheetId} />
      <label htmlFor="comment-body" className="sr-only">ความคิดเห็น</label>
      <textarea
        id="comment-body"
        name="body"
        required
        maxLength={COMMENT_MAX}
        rows={3}
        placeholder="ชีทนี้ช่วยได้ไหม มีตรงไหนอยากให้เพิ่ม บอกผู้จัดทำได้เลย"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="field text-sm"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs">{body.length}/{COMMENT_MAX}</span>
        <button disabled={pending || !body.trim()} className="btn-primary btn-sm">
          {pending ? "กำลังส่ง…" : "ส่งความคิดเห็น"}
        </button>
      </div>
      <Notice state={state} />
    </form>
  );
}

export function DeleteCommentButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!confirm("ลบความคิดเห็นนี้?")) return;
          start(async () => {
            const res = await deleteComment(id);
            if (!res?.ok) setError(res?.message ?? "ลบไม่สำเร็จ");
          });
        }}
        className="cursor-pointer text-xs text-red-600 hover:underline disabled:opacity-50"
      >
        {pending ? "กำลังลบ…" : "ลบ"}
      </button>
      {error && <span role="alert" className="text-xs text-red-600">{error}</span>}
    </>
  );
}
