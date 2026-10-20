import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { AdminNav } from "@/components/admin/admin-nav";
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
      {/* Compact admin bar (instead of the site header): logo, sections, back to the site */}
      <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
        <div className="container-page flex flex-wrap items-center gap-x-6 pt-3 lg:flex-nowrap lg:pt-0">
          <Link href="/admin" className="flex shrink-0 items-center gap-3 py-1 lg:py-3" aria-label="แดชบอร์ดผู้ดูแล">
            <img src={withBase("/img/logo-240.webp")} srcSet={`${withBase("/img/logo-240.webp")} 1x, ${withBase("/img/logo-480.webp")} 2x`} alt="" width={120} height={35} className="h-8 w-auto" />
            <span className="border-l border-line pl-3 text-base font-bold text-ink">ผู้ดูแลระบบ</span>
          </Link>
          <Link href="/" className="ml-auto shrink-0 text-sm font-medium text-primary hover:underline lg:order-last">กลับหน้าเว็บ ↗</Link>
          <div className="order-last w-full min-w-0 lg:order-none lg:w-auto lg:flex-1">
            <AdminNav pending={pending} superAdmin={admin.isSuperAdmin} />
          </div>
        </div>
      </header>
      <main id="main" className="min-h-[70vh] flex-1 bg-primary-50/50">
        <h1 className="sr-only">ผู้ดูแลระบบ</h1>
        <div className="container-page py-8">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
