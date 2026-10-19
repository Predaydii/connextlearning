import type { Metadata } from "next";
import Link from "next/link";
import { SheetCard } from "@/components/sheet-card";
import { SheetFiltersPanel } from "@/components/sheet-filters";
import { getFacets, getSheetList, parseFilters, type SheetFilters } from "@/lib/queries";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "ชีทสรุปทั้งหมด",
  description: "รวมชีทสรุปทุกวิชา ม.1–ม.6 จากนักเรียนโรงเรียนตราษตระการคุณ",
};

function href(f: SheetFilters, patch: Partial<Pick<SheetFilters, "sort" | "page">>) {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  f.grades.forEach((v) => sp.append("grade", v));
  f.subjects.forEach((v) => sp.append("subject", v));
  f.semesters.forEach((v) => sp.append("semester", String(v)));
  f.years.forEach((v) => sp.append("year", String(v)));
  const sort = patch.sort ?? f.sort;
  if (sort !== "latest") sp.set("sort", sort);
  const page = patch.page ?? f.page;
  if (page > 1) sp.set("page", String(page));
  const s = sp.toString();
  return s ? `/sheets?${s}` : "/sheets";
}

export default async function SheetsPage(props: PageProps<"/sheets">) {
  const filters = parseFilters(await props.searchParams);
  const [{ items, total, pages }, facets] = await Promise.all([getSheetList(filters), getFacets()]);

  return (
    <div className="container-page py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold">ชีทสรุปทั้งหมด</h1>
        </div>
        <Link href="/sheets/upload" className="btn-primary btn-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-4" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
          อัปโหลดชีท
        </Link>
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr] lg:gap-10">
        <SheetFiltersPanel filters={filters} facets={facets} />

        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              {filters.q && <>ผลการค้นหา “<strong className="text-ink">{filters.q}</strong>” · </>}
              พบ <strong className="text-ink">{formatNumber(total)}</strong> ชีท
            </p>
            <nav aria-label="เรียงลำดับ" className="flex rounded-full bg-primary-50 p-1 text-sm">
              {(["latest", "popular"] as const).map((s) => (
                <Link
                  key={s}
                  href={href(filters, { sort: s, page: 1 })}
                  scroll={false}
                  aria-current={filters.sort === s ? "true" : undefined}
                  className={`rounded-full px-4 py-1.5 font-medium transition ${filters.sort === s ? "bg-primary text-white shadow" : "text-ink hover:text-primary"}`}
                >
                  {s === "latest" ? "ล่าสุด" : "ยอดนิยม"}
                </Link>
              ))}
            </nav>
          </div>

          {items.length === 0 ? (
            <div className="card grid place-items-center px-6 py-20 text-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="mb-4 size-14 text-primary/40" aria-hidden>
                <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" />
              </svg>
              <p className="text-lg font-semibold text-ink">ยังไม่มีชีทสรุปที่ตรงกับตัวกรอง</p>
              <p className="mt-1 text-sm">ลองเปลี่ยนตัวกรอง หรือเป็นคนแรกที่แชร์ชีทในหมวดนี้</p>
              <Link href="/sheets/upload" className="btn-primary btn-sm mt-6">แชร์ชีทของคุณ</Link>
            </div>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((s, i) => (
                <li key={s.id}><SheetCard sheet={s} priority={i < 3} /></li>
              ))}
            </ul>
          )}

          {pages > 1 && <Pagination filters={filters} pages={pages} />}
        </div>
      </div>
    </div>
  );
}

function Pagination({ filters, pages }: { filters: SheetFilters; pages: number }) {
  const cur = Math.min(filters.page, pages);
  const nums = [...new Set([1, cur - 1, cur, cur + 1, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const base = "grid h-10 min-w-10 place-items-center rounded-full px-3 text-sm font-medium transition";
  return (
    <nav aria-label="หน้า" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      {cur > 1 && <Link href={href(filters, { page: cur - 1 })} className={`${base} text-ink hover:bg-primary-50`}>‹ ก่อนหน้า</Link>}
      {nums.map((n, i) => (
        <span key={n} className="contents">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-body/60">…</span>}
          <Link
            href={href(filters, { page: n })}
            aria-current={n === cur ? "page" : undefined}
            className={`${base} ${n === cur ? "bg-primary text-white" : "text-ink hover:bg-primary-50"}`}
          >
            {n}
          </Link>
        </span>
      ))}
      {cur < pages && <Link href={href(filters, { page: cur + 1 })} className={`${base} text-ink hover:bg-primary-50`}>ถัดไป ›</Link>}
    </nav>
  );
}
