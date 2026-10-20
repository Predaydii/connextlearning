import Link from "next/link";

const UPDATED = "21 ตุลาคม 2569";

/** Shared layout for /privacy, /terms and /cookies. */
export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="bg-primary-50/50 py-10 md:py-14">
      <article className="container-page max-w-3xl">
        <nav aria-label="นโยบาย" className="mb-6 flex flex-wrap gap-2 text-sm">
          <Link href="/privacy" className="rounded-full bg-white px-3 py-1 ring-1 ring-line hover:text-primary">Privacy Policy</Link>
          <Link href="/terms" className="rounded-full bg-white px-3 py-1 ring-1 ring-line hover:text-primary">Terms and Conditions</Link>
          <Link href="/cookies" className="rounded-full bg-white px-3 py-1 ring-1 ring-line hover:text-primary">Cookie Policy</Link>
        </nav>
        <div className="card legal p-6 sm:p-10">
          <h1 className="text-[clamp(1.6rem,3.2vw,2.2rem)] font-bold">{title}</h1>
          <p className="mt-1 text-sm">ปรับปรุงล่าสุด {UPDATED}</p>
          <p className="mt-6">{intro}</p>
          <div className="mt-2">{children}</div>
          <h2>ติดต่อเรา</h2>
          <p>
            สภานักเรียนโรงเรียนตราษตระการคุณ 494 ถ.เนินตาแมว ต.วังกระแจะ อ.เมืองตราด จ.ตราด 23000
            หรือทางช่องทางโซเชียลที่ด้านล่างของเว็บไซต์
          </p>
        </div>
      </article>
    </div>
  );
}
