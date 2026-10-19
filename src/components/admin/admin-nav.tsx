"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminHref } from "@/lib/urls";

const TABS = [
  { path: "/", label: "แดชบอร์ด" },
  { path: "/sheets", label: "ตรวจสอบชีท" },
  { path: "/covers", label: "ภาพปก" },
];

export function AdminNav({ pending }: { pending: number }) {
  // Works whether the browser shows "/sheets" (admin subdomain) or "/admin/sheets" (local dev)
  const current = usePathname().replace(/^\/admin(?=\/|$)/, "") || "/";
  return (
    <nav aria-label="เมนูผู้ดูแล" className="-mb-px flex w-full gap-1 overflow-x-auto sm:w-auto">
      {TABS.map((t) => {
        const active = t.path === "/" ? current === "/" : current.startsWith(t.path);
        return (
          <Link
            key={t.path}
            href={adminHref(t.path)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 whitespace-nowrap border-b-[3px] px-4 pt-2 pb-3 font-medium transition ${
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
