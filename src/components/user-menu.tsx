"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Avatar } from "@/components/avatar";
import { adminHref } from "@/lib/urls";

const isAdminUser = (u: unknown) => (u as { role?: string }).role === "ADMIN";

/**
 * The avatar simply opens "โปรไฟล์ของฉัน" (edit details, my sheets, admin and sign-out
 * live there). Signed out: the login button.
 * variant "header": desktop header only · variant "drawer": inside the mobile menu.
 */
export function UserMenu({ base = "", variant = "header" }: { base?: string; variant?: "header" | "drawer" }) {
  const { data: session, isPending } = authClient.useSession();
  const pathname = usePathname();

  if (variant === "drawer") {
    if (isPending) return null;
    return (
      <li className="mt-2 border-t border-line pt-3 md:hidden">
        {session ? (
          <>
            <Link href={`${base}/u/${session.user.id}`} className="flex items-center gap-3 rounded-xl px-4 py-2.5 transition hover:bg-sky-50">
              <Avatar name={session.user.name} image={session.user.image} size={40} />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-ink">{session.user.name}</span>
                <span className="block text-xs text-primary">โปรไฟล์ของฉัน</span>
              </span>
            </Link>
            {isAdminUser(session.user) && (
              <Link href={adminHref("/")} className="mt-1 flex items-center gap-3 rounded-xl px-4 py-2.5 font-medium text-ink transition hover:bg-sky-50 hover:text-primary">
                <DashIcon /> แดชบอร์ดผู้ดูแล
              </Link>
            )}
          </>
        ) : (
          <Link href={loginHref(base, pathname)} className="btn-primary btn-sm w-full">เข้าสู่ระบบ</Link>
        )}
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

  return (
    <div className="hidden items-center gap-2 md:flex">
      {isAdminUser(session.user) && (
        <Link href={adminHref("/")} title="แดชบอร์ดผู้ดูแล" className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-ink ring-1 ring-line transition hover:bg-sky-50 hover:text-primary">
          <DashIcon /> ผู้ดูแล
        </Link>
      )}
      <Link
        href={`${base}/u/${session.user.id}`}
        aria-label="โปรไฟล์ของฉัน"
        title="โปรไฟล์ของฉัน"
        className="rounded-full ring-2 ring-transparent transition hover:ring-primary/30"
      >
        <Avatar name={session.user.name} image={session.user.image} size={40} />
      </Link>
    </div>
  );
}

function DashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]" aria-hidden>
      <path d="M4 13h6V4H4zm0 7h6v-5H4zm10 0h6v-9h-6zm0-16v5h6V4z" />
    </svg>
  );
}

function loginHref(base: string, pathname: string | null) {
  const cb = pathname && pathname !== "/login" ? `?callbackUrl=${encodeURIComponent(pathname)}` : "";
  return `${base}/login${cb}`;
}
