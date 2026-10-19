"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Avatar } from "@/components/avatar";
import { adminHref } from "@/lib/urls";

/**
 * variant "header": avatar menu, or the login button on desktop.
 * variant "drawer": the login button inside the mobile menu (signed-out only).
 */
export function UserMenu({ base = "", variant = "header" }: { base?: string; variant?: "header" | "drawer" }) {
  const { data: session, isPending } = authClient.useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (variant === "drawer") {
    if (isPending || session) return null;
    return (
      <li className="mt-2 border-t border-line pt-3 md:hidden">
        <Link href={loginHref(base, pathname)} className="btn-primary btn-sm w-full">เข้าสู่ระบบ</Link>
      </li>
    );
  }

  if (isPending) return <div className="hidden size-10 animate-pulse rounded-full bg-primary-50 md:block" aria-hidden />;

  if (!session) {
    return (
      <Link href={loginHref(base, pathname)} className="btn-primary btn-sm hidden whitespace-nowrap md:inline-flex">
        เข้าสู่ระบบ
      </Link>
    );
  }

  const user = session.user as typeof session.user & { role?: string };
  const isAdmin = user.role === "ADMIN";

  const signOut = async () => {
    await authClient.signOut();
    setOpen(false);
    router.push(`${base}/`);
    router.refresh();
  };

  const item = "block rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-primary-50 hover:text-primary";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="เมนูผู้ใช้"
        className="flex cursor-pointer items-center rounded-full ring-2 ring-transparent transition hover:ring-primary/30"
      >
        <Avatar name={user.name} image={user.image} size={40} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 rounded-2xl bg-white p-2 shadow-brand-lg ring-1 ring-line"
        >
          <div className="border-b border-line px-3 pt-1 pb-3">
            <p className="truncate font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs">{user.email}</p>
          </div>
          <div className="pt-2" onClick={() => setOpen(false)}>
            <Link role="menuitem" href={`${base}/sheets/upload`} className={item}>อัปโหลดชีทสรุป</Link>
            <Link role="menuitem" href={`${base}/my-sheets`} className={item}>ชีทของฉัน</Link>
            <Link role="menuitem" href={`${base}/u/${user.id}`} className={item}>โปรไฟล์ของฉัน</Link>
            {isAdmin && (
              <Link role="menuitem" href={adminHref("/")} className={`${item} font-medium text-primary`}>แดชบอร์ดผู้ดูแล</Link>
            )}
          </div>
          <button role="menuitem" type="button" onClick={signOut} className={`${item} mt-1 w-full cursor-pointer border-t border-line pt-2.5 text-left text-red-600`}>
            ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  );
}

function loginHref(base: string, pathname: string | null) {
  const cb = pathname && pathname !== "/login" ? `?callbackUrl=${encodeURIComponent(pathname)}` : "";
  return `${base}/login${cb}`;
}
