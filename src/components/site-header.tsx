"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { UserMenu } from "@/components/user-menu";
import { withBase } from "@/lib/urls";

const LINKS = [
  { href: "/", label: "หน้าหลัก", match: (p: string) => p === "/" },
  { href: "/sheets", label: "ชีทสรุป", match: (p: string) => p.startsWith("/sheets") },
  { href: "/#classroom", label: "ห้องเรียน", match: () => false },
  { href: "/news", label: "ข่าวสารการศึกษา", match: (p: string) => p.startsWith("/news") },
];

/**
 * `base` prefixes every link. It is "" on the public site and the main site's
 * URL when the header is rendered on the admin subdomain.
 */
export function SiteHeader({ base = "" }: { base?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile menu with Escape (links close it on click)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/90 shadow-[0_4px_20px_rgb(16_26_77/0.07)] backdrop-blur-md backdrop-saturate-150">
      <nav className="container-page flex h-16 items-center justify-between gap-4 md:h-[76px]" aria-label="เมนูหลัก">
        <Link href={`${base}/`} aria-label="Connext Learning หน้าหลัก" className="shrink-0">
          <img
            src={withBase("/img/logo-240.webp")}
            srcSet={`${withBase("/img/logo-240.webp")} 1x, ${withBase("/img/logo-480.webp")} 2x`}
            width={180}
            height={52}
            alt="Connext Learning"
            className="h-[42px] w-auto md:h-[52px]"
          />
        </Link>

        <div className="flex items-center gap-2">
          <ul
            id="nav-menu"
            onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
            className={`absolute inset-x-0 top-16 flex flex-col gap-1 border-t border-line bg-white px-4 pt-3 pb-5 shadow-[0_16px_24px_rgb(16_26_77/0.1)] transition duration-200 md:static md:visible md:flex-row md:items-center md:gap-2 md:border-0 md:bg-transparent md:p-0 md:opacity-100 md:shadow-none md:translate-y-0 ${
              open ? "visible opacity-100" : "invisible -translate-y-2 opacity-0"
            }`}
          >
            {LINKS.map((l) => {
              const active = !base && l.match(pathname);
              return (
                <li key={l.href}>
                  <Link
                    href={`${base}${l.href}`}
                    aria-current={active ? "page" : undefined}
                    className={`relative block rounded-xl px-4 py-3 font-medium transition md:rounded-none md:px-3 md:py-2 md:after:absolute md:after:inset-x-3 md:after:-bottom-0.5 md:after:h-[2.5px] md:after:origin-left md:after:rounded-full md:after:bg-primary md:after:transition-transform md:after:duration-300 md:hover:bg-transparent ${
                      active
                        ? "bg-sky-100 text-primary md:bg-transparent md:after:scale-x-100"
                        : "text-ink hover:bg-sky-50 hover:text-primary active:bg-sky-100 md:after:scale-x-0 md:active:bg-transparent"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
            <UserMenu base={base} variant="drawer" />
          </ul>

          <UserMenu base={base} />

          {/* Three lines that fold into a centred X */}
          <button
            type="button"
            className="relative grid size-11 cursor-pointer place-items-center rounded-xl text-primary transition active:scale-95 md:hidden"
            aria-controls="nav-menu"
            aria-expanded={open}
            aria-label={open ? "ปิดเมนู" : "เปิดเมนู"}
            onClick={() => setOpen((v) => !v)}
          >
            <span aria-hidden className="relative block h-[18px] w-6">
              <span className={`absolute left-0 h-[2.5px] w-6 rounded-full bg-current transition-all duration-300 ease-out ${open ? "top-[7.75px] rotate-45" : "top-0"}`} />
              <span className={`absolute top-[7.75px] left-0 h-[2.5px] w-6 rounded-full bg-current transition-all duration-200 ${open ? "scale-x-0 opacity-0" : ""}`} />
              <span className={`absolute left-0 h-[2.5px] w-6 rounded-full bg-current transition-all duration-300 ease-out ${open ? "top-[7.75px] -rotate-45" : "top-[15.5px]"}`} />
            </span>
          </button>
        </div>
      </nav>
    </header>
  );
}
