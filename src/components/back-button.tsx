"use client";

import { useRouter } from "next/navigation";

/** Back arrow: returns to the previous page (keeps filters), or to the sheet list. */
export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label="ย้อนกลับ"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/sheets"))}
      className="mb-6 grid size-11 cursor-pointer place-items-center rounded-full bg-white text-primary shadow-card ring-1 ring-line transition hover:-translate-x-0.5 hover:bg-primary-50"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="size-5" aria-hidden>
        <path d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
    </button>
  );
}
