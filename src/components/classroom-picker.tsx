"use client";

import { useEffect, useRef, useState } from "react";
import { GRADES } from "@/lib/constants";
import { classroomsOf } from "@/lib/classrooms";
import type { Grade } from "@/generated/prisma/enums";

/** Grade buttons (ม.1–ม.6); each opens a dialog listing that grade's Google Meet rooms. */
export function ClassroomPicker() {
  const [grade, setGrade] = useState<Grade | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (grade && !d.open) d.showModal();
    if (!grade && d.open) d.close();
  }, [grade]);

  const info = GRADES.find((g) => g.value === grade);

  return (
    <>
      <ul className="grid grid-cols-2 gap-[clamp(14px,2vw,22px)] min-[561px]:grid-cols-3 lg:grid-cols-6">
        {GRADES.map((g, i) => (
          <li key={g.value}>
            <button
              type="button"
              onClick={() => setGrade(g.value)}
              aria-haspopup="dialog"
              className={`group relative isolate flex min-h-[150px] w-full cursor-pointer flex-col items-start overflow-hidden rounded-[20px] p-4 text-left text-white shadow-brand transition duration-300 hover:-translate-y-1.5 hover:shadow-brand-lg min-[561px]:min-h-[180px] min-[561px]:px-5 min-[561px]:py-[22px] ${
                i < 3
                  ? "bg-[linear-gradient(150deg,#3a57e0_0%,#203cc7_55%,#13237a_100%)]"
                  : "bg-[linear-gradient(150deg,#1bb3ea_0%,#0a86c9_50%,#203cc7_100%)]"
              }`}
            >
              <span className="absolute -top-[50px] -right-[50px] -z-10 size-[140px] rounded-full bg-white/12 transition duration-500 group-hover:scale-[1.35]" />
              <span className="text-[clamp(2.2rem,3.4vw,2.8rem)] leading-[1.1] font-bold">{g.label}</span>
              <span className="mt-1 text-sm opacity-90">{g.full}</span>
              <span className="mt-auto inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1 text-sm font-semibold text-ink">
                เข้าเรียน <span aria-hidden className="transition group-hover:translate-x-1">→</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        onClose={() => setGrade(null)}
        onClick={(e) => e.target === e.currentTarget && setGrade(null)} // click on the backdrop
        aria-labelledby="classroom-dialog-title"
        className="m-auto w-[min(560px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] overflow-y-auto rounded-3xl bg-white p-0 shadow-2xl backdrop:bg-ink/50 backdrop:backdrop-blur-sm"
      >
        {info && (
          <div className="p-6 sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h3 id="classroom-dialog-title" className="text-2xl font-bold">{info.full}</h3>
              </div>
              <button
                type="button"
                onClick={() => setGrade(null)}
                aria-label="ปิด"
                className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-primary-50 text-primary transition hover:bg-primary hover:text-white"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-5" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {classroomsOf(info.value).map((c) => (
                <li key={c.room}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-3 rounded-2xl p-3 ring-1 ring-line transition hover:-translate-y-0.5 hover:bg-primary-50 hover:ring-primary/40"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-white">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden>
                        <rect x="2.5" y="6" width="13" height="12" rx="2.5" /><path d="m15.5 10.5 6-3.5v10l-6-3.5z" />
                      </svg>
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink">ห้อง {info.label}/{c.room.split("/")[1]}</span>
                      <span className="block text-xs text-body/80 group-hover:text-primary">เข้าห้องเรียน ↗</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </dialog>
    </>
  );
}
