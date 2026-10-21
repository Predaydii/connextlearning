"use client";

import { useState, useSyncExternalStore } from "react";
import { GRADES } from "@/lib/constants";
import { classroomsOf } from "@/lib/classrooms";
import type { Grade } from "@/generated/prisma/enums";

const STORAGE_KEY = "classroom-grade";

const noSubscribe = () => () => {};
function readSaved(): Grade | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return GRADES.find((g) => g.value === v)?.value ?? null;
  } catch {
    return null;
  }
}

/** Grade tabs (ม.1–ม.6) with that grade's Google Meet rooms right below; the last grade is remembered. */
export function ClassroomPicker() {
  const saved = useSyncExternalStore(noSubscribe, readSaved, () => null);
  const [picked, setPicked] = useState<Grade | null>(null);
  const grade = picked ?? saved ?? "M1";

  function pick(g: Grade) {
    setPicked(g);
    try {
      localStorage.setItem(STORAGE_KEY, g);
    } catch {}
  }

  const info = GRADES.find((g) => g.value === grade)!;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-line bg-primary-50/40 p-2 sm:p-3">
        <div role="group" aria-label="เลือกระดับชั้น" className="grid grid-cols-6 gap-1 sm:gap-2">
          {GRADES.map((g) => {
            const active = g.value === grade;
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => pick(g.value)}
                aria-pressed={active}
                className={`cursor-pointer rounded-xl py-2.5 text-[15px] font-semibold transition sm:py-3 sm:text-lg ${
                  active ? "bg-primary text-white shadow-brand" : "text-ink hover:bg-white hover:text-primary"
                }`}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <ul key={grade} className="grid grid-cols-3 gap-2.5 sm:gap-3 md:grid-cols-5 lg:grid-cols-9">
          {classroomsOf(grade).map((c, i) => (
            <li key={c.room} className="motion-safe:animate-rise" style={{ animationDelay: `${i * 30}ms` }}>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`เข้าห้องเรียนออนไลน์ ${info.label}/${c.room.split("/")[1]} (Google Meet)`}
                className="group flex items-center justify-center rounded-xl border border-line bg-white px-2 py-4 text-center transition hover:-translate-y-0.5 hover:border-primary hover:bg-primary-50 sm:py-5"
              >
                <span className="text-lg leading-none font-bold text-ink group-hover:text-primary sm:text-xl">{info.label}/{c.room.split("/")[1]}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

