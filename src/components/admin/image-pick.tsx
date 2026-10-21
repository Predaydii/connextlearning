"use client";

import { useState } from "react";

/**
 * Click the image to choose a file (no "Choose File" button). The input stays in the
 * form (visually hidden, still keyboard-focusable), so submitting works as before.
 * `onPick` gets the chosen files (preview URLs are handled here).
 */
export function ImagePick({
  name = "file",
  src,
  aspect = "aspect-video",
  className = "",
  multiple = false,
  required = false,
  placeholder = "คลิกเพื่อเลือกรูป",
  alt = "",
  badge,
  onPick,
}: {
  name?: string;
  src?: string | null;
  aspect?: string;
  className?: string;
  multiple?: boolean;
  required?: boolean;
  placeholder?: string;
  alt?: string;
  /** small label over the top-left corner, e.g. "ภาพเริ่มต้น" */
  badge?: (picked: boolean) => React.ReactNode;
  onPick?: (files: File[]) => void;
}) {
  const [preview, setPreview] = useState<string[]>([]);
  const shown = preview[0] ?? src ?? null;

  return (
    <label className={`group relative block cursor-pointer overflow-hidden rounded-xl bg-primary-50 ring-1 ring-line transition focus-within:ring-4 focus-within:ring-primary/30 hover:ring-primary/50 ${aspect} ${className}`}>
      {shown ? (
        <img src={shown} alt={alt} className="size-full object-cover" />
      ) : (
        <span className="grid size-full place-items-center gap-1 text-center text-xs text-body">
          <span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-1 size-6 text-primary" aria-hidden>
              <path d="M3 5h18v14H3zm0 11 5-5 4 4 3-3 6 6M15.5 9.5h.01" />
            </svg>
            {placeholder}
          </span>
        </span>
      )}
      {badge && <span className="pointer-events-none absolute top-2 left-2 z-[1]">{badge(preview.length > 0)}</span>}
      {preview.length > 1 && (
        <span className="absolute top-2 right-2 rounded-full bg-ink/70 px-2 py-0.5 text-[11px] font-semibold text-white">{preview.length} รูป</span>
      )}
      {shown && (
        <span className="absolute inset-0 grid place-items-center bg-ink/45 text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
          คลิกเพื่อเปลี่ยนรูป
        </span>
      )}
      <input
        type="file"
        name={name}
        multiple={multiple}
        required={required}
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          preview.forEach((u) => URL.revokeObjectURL(u));
          setPreview(files.map((f) => URL.createObjectURL(f)));
          onPick?.(files);
        }}
      />
    </label>
  );
}
