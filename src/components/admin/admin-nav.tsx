"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminHref } from "@/lib/urls";

type Item = { path: string; label: string; desc: string; icon: string; superOnly?: boolean };

/** Admin sections, grouped by task. Also the source of each page's title and description. */
const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "ภาพรวม",
    items: [{ path: "/", label: "แดชบอร์ด", desc: "สรุปการใช้งานและงานที่รอดำเนินการ", icon: "M4 13h6V4H4zm0 7h6v-5H4zm10 0h6v-9h-6zm0-16v5h6V4z" }],
  },
  {
    label: "งานประจำ",
    items: [
      { path: "/sheets", label: "ตรวจสอบชีท", desc: "อนุมัติ แก้ไขรายละเอียด ซ่อน หรือลบชีทที่ส่งเข้ามา", icon: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zm0 0v6h6M9 15l2 2 4-4" },
      { path: "/users", label: "ผู้ใช้งาน", desc: "ดูว่าใครใช้งานเว็บ ค้นหา กรอง และดาวน์โหลดรายชื่อ", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm13 10v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" },
    ],
  },
  {
    label: "เนื้อหาเว็บไซต์",
    items: [
      { path: "/home", label: "หน้าแรก", desc: "ภาพชีทสรุปแยกตามชั้นและวิดีโอบนหน้าแรก", icon: "M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
      { path: "/news", label: "ข่าวสารการศึกษา", desc: "การ์ดข่าวพร้อมหมวดหมู่บนหน้าข่าวสารการศึกษา", icon: "M4 4h13v16H6a2 2 0 0 1-2-2zm13 4h3v10a2 2 0 0 1-2 2M8 8h5M8 12h5M8 16h3" },
      { path: "/covers", label: "ภาพปก", desc: "ภาพปกเริ่มต้นของชีท แยกตามวิชาหรือใช้ภาพเดียวกันทั้งหมด", icon: "M3 5h18v14H3zm0 11 5-5 4 4 3-3 6 6M15.5 9.5h.01" },
    ],
  },
  {
    label: "ระบบ",
    items: [{ path: "/admins", label: "ผู้ดูแล", desc: "เพิ่มหรือถอดสิทธิ์ผู้ดูแลรอง", icon: "M12 3 4 6v6c0 5 3.4 8.4 8 9 4.6-.6 8-4 8-9V6zm-3 9 2 2 4-4", superOnly: true }],
  },
];

function useCurrent() {
  // Admin-relative path ("/sheets/abc"), with or without the /admin prefix
  return usePathname().replace(/^\/admin(?=\/|$)/, "") || "/";
}

const isActive = (path: string, current: string) => (path === "/" ? current === "/" : current.startsWith(path));

/** Sidebar on wide screens, a scrolling row of tabs on phones. */
export function AdminNav({ pending, superAdmin }: { pending: number; superAdmin: boolean }) {
  const current = useCurrent();
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.superOnly || superAdmin) })).filter((g) => g.items.length);

  return (
    <nav aria-label="เมนูผู้ดูแล" className="flex gap-1 overflow-x-auto [scrollbar-width:none] lg:flex-col lg:gap-6 lg:overflow-visible">
      {groups.map((g) => (
        <div key={g.label} className="contents lg:block">
          <p className="mb-1.5 hidden px-3 text-[11px] font-semibold tracking-wider text-body/70 uppercase lg:block">{g.label}</p>
          <ul className="contents lg:grid lg:gap-0.5">
            {g.items.map((t) => {
              const active = isActive(t.path, current);
              return (
                <li key={t.path} className="shrink-0">
                  <Link
                    href={adminHref(t.path)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-[15px] font-medium whitespace-nowrap transition ${
                      active ? "bg-primary text-white shadow-brand" : "text-ink hover:bg-white hover:text-primary"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[18px] shrink-0" aria-hidden>
                      <path d={t.icon} />
                    </svg>
                    {t.label}
                    {t.path === "/sheets" && pending > 0 && (
                      <span className={`ml-auto rounded-full px-2 text-xs font-bold ${active ? "bg-white text-primary" : "bg-accent text-ink"}`}>{pending}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Title and one-line description of the current admin page, from GROUPS. */
export function AdminPageTitle() {
  const current = useCurrent();
  const item = GROUPS.flatMap((g) => g.items)
    .filter((i) => isActive(i.path, current))
    .sort((a, b) => b.path.length - a.path.length)[0];
  if (!item) return null;
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-ink">{item.label}</h1>
      <p className="mt-0.5 text-sm">{item.desc}</p>
    </div>
  );
}
