"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminHref } from "@/lib/urls";

const TABS = [
  { path: "/", label: "แดชบอร์ด" },
  { path: "/sheets", label: "ตรวจสอบชีท" },
  { path: "/users", label: "ผู้ใช้งาน" },
  { path: "/home", label: "หน้าแรก" },
  { path: "/covers", label: "ภาพปก" },
  { path: "/news", label: "ข่าวสาร" },
];

export function AdminNav({ pending, superAdmin }: { pending: number; superAdmin: boolean }) {
  // Works whether the browser shows "/sheets" (admin subdomain) or "/admin/sheets" (local dev)
  const current = usePathname().replace(/^\/admin(?=\/|$)/, "") || "/";
  return (
    <nav aria-label="เมนูผู้ดูแล" className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none]">
      {(superAdmin ? [...TABS, { path: "/admins", label: "ผู้ดูแล" }] : TABS).map((t) => {
        const active = t.path === "/" ? current === "/" : current.startsWith(t.path);
        return (
          <Link
            key={t.path}
            href={adminHref(t.path)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 whitespace-nowrap border-b-[3px] px-3 py-3 text-[15px] font-medium transition lg:py-[18px] ${
              active ? "border-primary text-primary" : "border-transparent text-ink hover:text-primary"
            }`}
          >
            {t.label}
            {t.path === "/sheets" && pending > 0 && (
              <span className="rounded-full bg-accent px-2 text-xs font-semibold text-ink">{pending}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
