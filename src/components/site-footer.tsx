import Link from "next/link";
import { withBase } from "@/lib/urls";
import { formatNumber } from "@/lib/format";
import { getVisitStats } from "@/lib/queries";
import { VisitPing } from "@/components/visit-ping";

const SOCIAL: { label: string; href: string; path: string; evenOdd?: boolean }[] = [
  {
    label: "Facebook",
    href: "https://www.facebook.com/profile.php?id=61558304188276&locale=th_TH",
    path: "M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21z",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/tratcouncil/",
    path: "M7.6 2h8.8A5.6 5.6 0 0 1 22 7.6v8.8a5.6 5.6 0 0 1-5.6 5.6H7.6A5.6 5.6 0 0 1 2 16.4V7.6A5.6 5.6 0 0 1 7.6 2zm-.2 2A3.4 3.4 0 0 0 4 7.4v9.2A3.4 3.4 0 0 0 7.4 20h9.2a3.4 3.4 0 0 0 3.4-3.4V7.4A3.4 3.4 0 0 0 16.6 4zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.3-3.6a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6z",
    evenOdd: true,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@tk.studentcouncil",
    path: "M16.6 5.8A4.3 4.3 0 0 1 15.5 3h-3.1v12.4a2.6 2.6 0 1 1-2.6-2.6 2.7 2.7 0 0 1 .8.1V9.7a5.8 5.8 0 0 0-.8-.1 5.8 5.8 0 1 0 5.8 5.8V9.1a7.4 7.4 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.3-1.6z",
  },
  {
    label: "LINE",
    href: "https://lin.ee/6I8NURL",
    path: "M12 3C6.5 3 2 6.6 2 11c0 4 3.5 7.3 8.3 7.9.3.1.8.2.9.5.1.3.1.7 0 1l-.1.9c0 .3-.2 1 .9.6 1.1-.5 6-3.5 8.2-6A7.4 7.4 0 0 0 22 11c0-4.4-4.5-8-10-8zM8.4 13.4H6.5a.5.5 0 0 1-.5-.5V9.1a.5.5 0 0 1 1 0v3.3h1.4a.5.5 0 0 1 0 1zm2-.5a.5.5 0 0 1-1 0V9.1a.5.5 0 0 1 1 0zm4.6 0a.5.5 0 0 1-.9.3l-2-2.6v2.3a.5.5 0 0 1-1 0V9.1a.5.5 0 0 1 .9-.3l2 2.6V9.1a.5.5 0 0 1 1 0zm3-2.4a.5.5 0 0 1 0 1h-1.4v.9H18a.5.5 0 0 1 0 1h-1.9a.5.5 0 0 1-.5-.5V9.1a.5.5 0 0 1 .5-.5H18a.5.5 0 0 1 0 1h-1.4v.9z",
  },
  {
    label: "Website",
    href: "https://connext-party.space/",
    path: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-2.9a15.6 15.6 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8.2 8.2 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4zm.8 2h2.9c.3 1.3.8 2.5 1.4 3.6A8 8 0 0 1 5.1 16zM8 8H5.1a8 8 0 0 1 4.3-3.6C8.8 5.5 8.3 6.7 8 8zm4 12c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.3 5.6c.6-1.1 1.1-2.3 1.4-3.6h2.9a8 8 0 0 1-4.3 3.6zm1.7-5.6a16.5 16.5 0 0 0 0-4h3.4a8.2 8.2 0 0 1 0 4z",
  },
];

const MENU = [
  { href: "/", label: "หน้าหลัก" },
  { href: "/#classroom", label: "ห้องเรียนออนไลน์" },
  { href: "/sheets", label: "ชีทสรุปทั้งหมด" },
  { href: "/news", label: "ข่าวสาร" },
];
const SHEETS = [
  { href: "/sheets/upload", label: "แชร์ชีทของคุณ" },
  { href: "/sheets?grade=M1&grade=M2&grade=M3", label: "ชีทสรุป ม.ต้น" },
  { href: "/sheets?grade=M4&grade=M5&grade=M6", label: "ชีทสรุป ม.ปลาย" },
];
const LEGAL = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms and Conditions" },
  { href: "/cookies", label: "Cookie Policy" },
];

const linkCls = "text-white/75 transition hover:text-white";

/**
 * Dark footer with a wavy top and a blue glow that keeps drifting (.ft-* in globals.css).
 * `cta`: the "แชร์ชีทให้เพื่อน ๆ" call to action (off in the admin area).
 * `base` prefixes links when rendered outside the public site.
 */
export async function SiteFooter({ base = "", cta = true }: { base?: string; cta?: boolean }) {
  const visits = await getVisitStats().catch(() => null);
  return (
    <footer className="ft-wave relative isolate overflow-hidden bg-black text-[0.95rem] text-white/75">
      {/* ft-wave (globals.css): the wavy top edge is cut out with a mask and overlaps the section above */}
      <div aria-hidden className="ft-glow pointer-events-none absolute inset-0 -z-10" />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(rgb(255_255_255/0.07)_1px,transparent_1.4px)] [background-size:22px_22px]" />

      {cta && (
        <section aria-labelledby="footer-cta" className="container-page pt-[clamp(88px,12vw,150px)] pb-[clamp(56px,8vw,96px)] text-center">
          <img src={withBase("/img/logo-white-240.webp")} srcSet={`${withBase("/img/logo-white-240.webp")} 1x, ${withBase("/img/logo-white-480.webp")} 2x`} width={160} height={46} alt="" loading="lazy" className="mx-auto mb-6 h-auto w-[150px]" />
          <h2 id="footer-cta" className="text-[clamp(2rem,6vw,3.6rem)] leading-tight font-bold text-white">แชร์ชีทให้เพื่อน ๆ</h2>
          <p className="mx-auto mt-4 max-w-xl text-[clamp(1rem,1.8vw,1.15rem)] leading-relaxed text-white/75">
            เตรียมพร้อมสอบเก็บคะแนน กลางภาค ปลายภาคไปด้วยกัน
            <br />
            <span className="font-semibold text-white">Connext Learning for All Learners.</span>
          </p>
          <div className="mx-auto mt-8 flex max-w-xs flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <Link href={`${base}/sheets/upload`} className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 font-semibold text-ink transition hover:-translate-y-0.5 hover:bg-accent">
              แชร์ชีทของคุณ
            </Link>
            <Link href={`${base}/sheets`} className="inline-flex min-h-12 items-center justify-center rounded-full px-7 font-semibold text-white ring-1 ring-white/40 transition hover:-translate-y-0.5 hover:bg-white/10">
              ดูชีทสรุปทั้งหมด
            </Link>
          </div>
        </section>
      )}

      <div className={`container-page grid grid-cols-2 gap-x-6 gap-y-9 pb-10 sm:grid-cols-4 lg:gap-10 ${cta ? "border-t border-white/10 pt-12" : "pt-[clamp(80px,10vw,120px)]"}`}>
        <FooterCol title="เมนู">
          {MENU.map((l) => <li key={l.label}><Link href={`${base}${l.href}`} className={linkCls}>{l.label}</Link></li>)}
        </FooterCol>
        <FooterCol title="ชีทสรุป">
          {SHEETS.map((l) => <li key={l.label}><Link href={`${base}${l.href}`} className={linkCls}>{l.label}</Link></li>)}
        </FooterCol>
        <div className="col-span-2 sm:col-span-1">
          <h3 className="mb-3 font-semibold text-white">ติดต่อเรา</h3>
          <address className="not-italic leading-[1.8]">
            สภานักเรียนโรงเรียนตราษตระการคุณ
            <br />494 ถ.เนินตาแมว ต.วังกระแจะ อ.เมืองตราด จ.ตราด 23000
          </address>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <h3 className="mb-3 font-semibold text-white">ติดตามเรา</h3>
          <ul className="flex flex-wrap gap-2.5" aria-label="ช่องทางโซเชียล">
            {SOCIAL.map((s) => (
              <li key={s.label}>
                <a
                  href={s.href}
                  aria-label={s.label}
                  title={s.label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-10 place-items-center rounded-xl bg-white/10 text-white transition hover:-translate-y-0.5 hover:bg-white hover:text-ink"
                >
                  <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden>
                    <path d={s.path} fillRule={s.evenOdd ? "evenodd" : undefined} />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-white/55">จัดทำและดูแลโดยสภานักเรียนโรงเรียนตราษตระการคุณ</p>
        </div>
      </div>

      <div className="container-page flex flex-col items-center gap-3 border-t border-white/10 py-6 text-[0.85rem] lg:flex-row lg:justify-between">
        <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {LEGAL.map((l) => <li key={l.href}><Link href={`${base}${l.href}`} className={linkCls}>{l.label}</Link></li>)}
        </ul>
        <span className="text-white/70">© โรงเรียนตราษตระการคุณ สงวนลิขสิทธิ์</span>
        {visits && (
          <span className="flex items-center gap-4 text-white/70" aria-label="สถิติการเข้าชม">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-full bg-emerald-400" />
              ผู้เข้าชมวันนี้ <strong className="font-semibold text-white tabular-nums">{formatNumber(visits.today)}</strong>
            </span>
            <span aria-hidden className="h-3 w-px bg-white/25" />
            <span>ทั้งหมด <strong className="font-semibold text-white tabular-nums">{formatNumber(visits.total)}</strong></span>
          </span>
        )}
        <VisitPing />
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 font-semibold text-white">{title}</h3>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}
