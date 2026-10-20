"use client";

import { useState } from "react";

/** Native share sheet on phones; elsewhere copies the link. `path` is site-relative. */
export function ShareButton({ path, title, text, className = "", label = "แชร์" }: { path: string; title: string; text?: string; className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = new URL(path, location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return; // closed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("คัดลอกลิงก์นี้", url);
    }
  }

  return (
    <button type="button" onClick={share} className={className} aria-live="polite">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]" aria-hidden>
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
      </svg>
      {copied ? "คัดลอกลิงก์แล้ว" : label}
    </button>
  );
}
