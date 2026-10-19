import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdminPage } from "@/lib/session";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: { default: "ผู้ดูแลระบบ", template: "%s | ผู้ดูแลระบบ" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdminPage("/");
  const pending = await db.sheet.count({ where: { status: "PENDING" } });
  return (
    <>
      <SiteHeader />
      <main id="main" className="min-h-[70vh] flex-1 bg-primary-50/50">
        <div className="border-b border-line bg-white">
          <div className="container-page flex flex-wrap items-center justify-between gap-3 pt-6">
            <div>
              <p className="text-sm font-medium text-sky">Connext Learning</p>
              <h1 className="text-2xl font-bold">ผู้ดูแลระบบ</h1>
            </div>
            <AdminNav pending={pending} />
          </div>
        </div>
        <div className="container-page py-8">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
