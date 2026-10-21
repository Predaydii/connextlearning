"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ACADEMIC_YEARS, GRADES, SEMESTERS, SUBJECTS } from "@/lib/constants";
import type { Facets, SheetFilters } from "@/lib/queries";

type Key = "grade" | "subject" | "semester" | "year";

function buildQuery(f: SheetFilters, patch: Partial<Record<Key, string[]>> & { q?: string } = {}) {
  const sp = new URLSearchParams();
  const q = patch.q ?? f.q;
  if (q) sp.set("q", q);
  const values: Record<Key, string[]> = {
    grade: patch.grade ?? f.grades,
    subject: patch.subject ?? f.subjects,
    semester: patch.semester ?? f.semesters.map(String),
    year: patch.year ?? f.years.map(String),
  };
  for (const [k, vs] of Object.entries(values)) vs.forEach((v) => sp.append(k, v));
  if (f.sort !== "latest") sp.set("sort", f.sort);
  const s = sp.toString();
  return s ? `/sheets?${s}` : "/sheets";
}

export function SheetFiltersPanel({ filters, facets }: { filters: SheetFilters; facets: Facets }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (!drawer) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawer(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [drawer]);

  const current: Record<Key, string[]> = {
    grade: filters.grades,
    subject: filters.subjects,
    semester: filters.semesters.map(String),
    year: filters.years.map(String),
  };
  const activeCount = Object.values(current).reduce((n, v) => n + v.length, 0);

  const go = (url: string) => startTransition(() => router.push(url, { scroll: false }));
  const toggle = (key: Key, value: string) => {
    const set = new Set(current[key]);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    go(buildQuery(filters, { [key]: [...set] }));
  };

  /** Search box: inside the desktop sidebar, or the big rounded field next to the filter button on phones. */
  const search = (big: boolean) => (
    <form
      role="search"
      className="relative flex-1"
      onSubmit={(e) => {
        e.preventDefault();
        const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
        go(buildQuery(filters, { q }));
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-body/70 ${big ? "left-3.5 size-[18px]" : "left-3 size-[18px]"}`} aria-hidden>
        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
      </svg>
      <input
        key={filters.q}
        type="search"
        name="q"
        defaultValue={filters.q}
        maxLength={100}
        enterKeyHint="search"
        placeholder={big ? "ค้นหาชื่อชีท, วิชา, ผู้อัปโหลด..." : "ค้นหาชีทสรุป"}
        className={big ? "field h-11 rounded-xl py-0 pl-10 text-sm" : "field pl-10 text-sm"}
        aria-label="ค้นหาชีทสรุป"
      />
    </form>
  );

  const groups = (
    <>
      <Group title="ระดับชั้น">
        {GRADES.map((g) => (
          <Check key={g.value} label={g.label} count={facets.grade[g.value]} checked={current.grade.includes(g.value)} onChange={() => toggle("grade", g.value)} />
        ))}
      </Group>
      <Group title="กลุ่มวิชา">
        {SUBJECTS.map((s) => (
          <Check key={s.id} label={s.name} count={facets.subject[s.id]} checked={current.subject.includes(s.id)} onChange={() => toggle("subject", s.id)} />
        ))}
      </Group>
      <Group title="ภาคเรียน">
        {SEMESTERS.map((s) => (
          <Check key={s} label={`ภาคเรียนที่ ${s}`} count={facets.semester[s]} checked={current.semester.includes(String(s))} onChange={() => toggle("semester", String(s))} />
        ))}
      </Group>
      <Group title="ปีการศึกษา">
        {ACADEMIC_YEARS.map((y) => (
          <Check key={y} label={String(y)} count={facets.year[y]} checked={current.year.includes(String(y))} onChange={() => toggle("year", String(y))} />
        ))}
      </Group>
    </>
  );

  const clear = activeCount > 0 && (
        <button
          type="button"
          onClick={() => go(buildQuery(filters, { grade: [], subject: [], semester: [], year: [] }))}
          className="mt-4 w-full cursor-pointer rounded-full border border-line py-2 text-sm font-medium text-primary transition hover:bg-primary-50"
        >
          ล้างตัวกรองทั้งหมด ({activeCount})
        </button>
  );

  const panel = (
    <div className={`space-y-1 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <div className="pb-5">
        <h2 className="mb-3 text-lg font-semibold after:mt-2 after:block after:h-[3px] after:w-9 after:rounded after:bg-sky">ค้นหา</h2>
        {search(false)}
      </div>
      {groups}
      {clear}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block" aria-label="ตัวกรองชีทสรุป">{panel}</aside>

      {/* Phones and tablets: filter button (opens the checkboxes) beside the search box */}
      <div className={`flex items-center gap-2 transition-opacity lg:hidden ${pending ? "opacity-60" : ""}`}>
        <button
          type="button"
          onClick={() => setDrawer(true)}
          className="relative grid size-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-line bg-white text-ink transition hover:text-primary"
          aria-expanded={drawer}
          aria-controls="filter-drawer"
          aria-label={activeCount ? `ตัวกรอง (เลือกอยู่ ${activeCount})` : "ตัวกรอง"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-5" aria-hidden>
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8M14 5v4M8 15v4" />
          </svg>
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 grid size-[18px] place-items-center rounded-full bg-primary text-[10px] font-semibold text-white">{activeCount}</span>
          )}
        </button>
        {search(true)}
      </div>
      {drawer && (
        <div className="fixed inset-0 z-[60] lg:hidden" id="filter-drawer" role="dialog" aria-modal="true" aria-label="ตัวกรองชีทสรุป">
          <button type="button" aria-label="ปิดตัวกรอง" className="absolute inset-0 bg-ink/40" onClick={() => setDrawer(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[min(340px,88vw)] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <p className="text-lg font-semibold text-ink">ตัวกรอง</p>
              <button type="button" onClick={() => setDrawer(false)} className="grid size-9 cursor-pointer place-items-center rounded-lg hover:bg-primary-50" aria-label="ปิด">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <div className="flex-1 space-y-1 overflow-y-auto px-5 pb-5">{groups}{clear}</div>
            <div className="border-t border-line p-4">
              <button type="button" onClick={() => setDrawer(false)} className="btn-primary w-full">ดูผลลัพธ์</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="group border-t border-line py-4">
      <summary className="flex cursor-pointer list-none items-center justify-between [&::-webkit-details-marker]:hidden">
        <span className="text-lg font-semibold text-ink after:mt-2 after:block after:h-[3px] after:w-9 after:rounded after:bg-sky">{title}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5 text-ink transition group-open:rotate-180" aria-hidden>
          <path d="m6 15 6-6 6 6" />
        </svg>
      </summary>
      <div className="mt-3 space-y-0.5">{children}</div>
    </details>
  );
}

function Check({ label, count, checked, onChange }: { label: string; count?: number; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 transition hover:bg-primary-50">
      <input type="checkbox" checked={checked} onChange={onChange} className="size-[18px] cursor-pointer rounded accent-primary" />
      <span className={`flex flex-1 items-center gap-2 text-[0.95rem] ${checked ? "font-medium text-primary" : "text-ink"}`}>
        {label}
      </span>
      <span className="text-xs text-body/70">({count ?? 0})</span>
    </label>
  );
}
