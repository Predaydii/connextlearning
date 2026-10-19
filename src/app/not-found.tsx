import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <div className="container-page grid place-items-center py-24 text-center">
          <p className="text-6xl font-bold text-primary">404</p>
          <h1 className="mt-3 text-2xl font-bold">ไม่พบหน้าที่คุณต้องการ</h1>
          <p className="mt-2">หน้านี้อาจถูกย้าย ลบ หรือยังไม่เผยแพร่</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/" className="btn-primary">กลับหน้าหลัก</Link>
            <Link href="/sheets" className="btn-outline">ดูชีทสรุป</Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
