import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { AdminNav, AdminPageTitle } from "@/components/admin/admin-nav";
import { requireAdminPage } from "@/lib/session";
import { db } from "@/lib/db";
import { withBase } from "@/lib/urls";

export const metadata: Metadata = {
  title: { default: "ผู้ดูแลระบบ", template: "%s | ผู้ดูแลระบบ" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdminPage("/");
  const pending = await db.sheet.count({ where: { status: "PENDING" } });
  return (
    <>
      {/* Compact admin bar (instead of the site header) */}
      <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
        <div className="container-page flex h-16 items-center gap-4">
          <Link href="/admin" className="flex shrink-0 items-center gap-3" aria-label="แดชบอร์ดผู้ดูแล">
            <img src={withBase("/img/logo-240.webp")} srcSet={`${withBase("/img/logo-240.webp")} 1x, ${withBase("/img/logo-480.webp")} 2x`} alt="" width={120} height={35} className="h-8 w-auto" />
            <span className="border-l border-line pl-3 text-base font-bold text-ink">ผู้ดูแลระบบ</span>
          </Link>
          <span className="ml-auto hidden truncate text-sm sm:block">{admin.name}{admin.isSuperAdmin ? " · ผู้ดูแลระบบหลัก" : ""}</span>
          <Link href="/" className="ml-auto shrink-0 rounded-full px-3 py-1.5 text-sm font-medium text-primary ring-1 ring-line transition hover:bg-primary-50 sm:ml-0">กลับหน้าเว็บ ↗</Link>
        </div>
      </header>
      <main id="main" className="site-main min-h-[70vh] flex-1 bg-primary-50/50">
        <div className="container-page grid grid-cols-[minmax(0,1fr)] gap-6 py-6 lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-10 lg:py-8">
          {/* phones: tabs that stick under the bar · wide screens: sticky sidebar */}
          <aside className="sticky top-16 z-40 -mx-4 min-w-0 bg-primary-50/95 px-4 py-2 backdrop-blur lg:top-24 lg:mx-0 lg:self-start lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <AdminNav pending={pending} superAdmin={admin.isSuperAdmin} />
          </aside>
          <div className="min-w-0">
            <AdminPageTitle />
            {children}
          </div>
        </div>
      </main>
      <SiteFooter cta={false} />
    </>
  );
}
