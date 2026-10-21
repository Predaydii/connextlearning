"use client";

import { useState } from "react";

/**
 * Turns the boarding pass (#targetId) into a PNG: phones that can share files open
 * the share sheet (Instagram story, LINE…), everything else downloads it.
 * Elements marked data-no-capture (these buttons) are left out of the picture.
 */
export function PassImageButton({ targetId, fileName, className = "" }: { targetId: string; fileName: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function run() {
    const node = document.getElementById(targetId);
    if (!node) return;
    setBusy(true);
    setNote(null);
    try {
      const { toBlob } = await import("html-to-image"); // loaded only when used
      const blob = await toBlob(node, {
        pixelRatio: 2,
        backgroundColor: "#eef2ff",
        filter: (el) => !(el instanceof HTMLElement && el.dataset.noCapture !== undefined),
        // a remote picture that cannot be fetched is left blank instead of failing the whole image
        imagePlaceholder: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
      });
      if (!blob) throw new Error("empty");
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: "Connext Learning" });
          return;
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
        }
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      setNote("บันทึกรูปแล้ว");
    } catch {
      setNote("สร้างรูปไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span data-no-capture className="grid gap-1">
      <button type="button" onClick={run} disabled={busy} title="บันทึกเป็นรูป หรือแชร์ลงสตอรี่" className={`whitespace-nowrap ${className}`}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]" aria-hidden>
          <path d="M12 3v12m0 0-4-4m4 4 4-4M5 21h14" />
        </svg>
        {busy ? "กำลังสร้างรูป…" : "บันทึกรูป"}
      </button>
      {note && <span role="status" className="text-center text-xs text-body">{note}</span>}
    </span>
  );
}
