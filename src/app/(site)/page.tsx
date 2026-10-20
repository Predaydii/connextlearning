import Link from "next/link";
import { withBase } from "@/lib/urls";
import { ClassroomPicker } from "@/components/classroom-picker";
import { SheetCard } from "@/components/sheet-card";
import { getLatestSheets, getSiteStats, type SheetCardData } from "@/lib/queries";
import { GRADES } from "@/lib/constants";
import { classroomsOf } from "@/lib/classrooms";
import { formatNumber } from "@/lib/format";

// Static page, refreshed every 2 minutes (latest sheets and stats are cached queries)
export const revalidate = 120;

// Grade artwork (4:5) in /public/img/sheets; each opens the sheets page filtered
const BY_GRADE = [
  { img: 1, alt: "ชีทสรุป ม.1", q: "grade=M1" },
  { img: 2, alt: "ชีทสรุป ม.2", q: "grade=M2" },
  { img: 3, alt: "ชีทสรุป ม.3", q: "grade=M3" },
  { img: 4, alt: "ชีทสรุป ม.4", q: "grade=M4" },
  { img: 5, alt: "ชีทสรุป ม.5", q: "grade=M5" },
  { img: 6, alt: "ชีทสรุป ม.6", q: "grade=M6" },
  { img: 7, alt: "ชีทสรุป วิชาอื่น ๆ ม.ต้น", q: "subject=other-lower" },
  { img: 8, alt: "ชีทสรุป วิชาอื่น ๆ ม.ปลาย", q: "subject=other-upper" },
];

const ROOMS = GRADES.reduce((n, g) => n + classroomsOf(g.value).length, 0);

export default async function HomePage() {
  const [latest, stats] = await Promise.all([getLatestSheets(4), getSiteStats()]);

  return (
    <>
      <Hero newest={latest[0]} />
      <Stats sheets={stats.sheets} views={stats.views} authors={stats.authors} />
      <ByGrade />
      {latest.length > 0 && <Latest sheets={latest} />}
      <ClassroomSection />
      <ShareBand />
    </>
  );
}

// ---------------------------------------------------------------------------

function Hero({ newest }: { newest?: SheetCardData }) {
  const rise = "motion-safe:animate-rise";
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#fff_0%,#fff_55%,var(--color-primary-50)_100%)]">
      <div className="container-page grid items-center gap-6 pt-8 md:pt-10 min-[901px]:grid-cols-[1.15fr_1fr] min-[901px]:gap-10">
        <div className="pb-10 min-[901px]:pb-14">
          <p className={`${rise} mb-4 inline-flex items-center gap-2 font-semibold text-primary-800 before:h-1 before:w-7 before:rounded before:bg-sky`}>
            โรงเรียนตราษตระการคุณ
          </p>
          <h1 className={`${rise} isolate text-[clamp(2rem,4.8vw,3.4rem)] leading-[1.2] font-bold tracking-tight text-primary-800 [animation-delay:80ms]`}>
            <span className="whitespace-nowrap">ชีทสรุปจากเพื่อน ๆ</span>
            <br />
            <span className="whitespace-nowrap">ห้องเรียนออนไลน์</span>{" "}
            <span className="relative whitespace-nowrap text-primary after:absolute after:-inset-x-[0.06em] after:bottom-[0.08em] after:-z-10 after:h-[0.4em] after:origin-left after:rounded-[0.12em] after:bg-accent/45 motion-safe:after:animate-highlight">
              ครบที่เดียว
            </span>
          </h1>
          <p className={`${rise} mt-5 max-w-[30rem] text-[1.05rem] [animation-delay:160ms]`}>
            อ่านชีทสรุปทุกวิชา ม.1–ม.6 ที่นักเรียนตราษฯ แชร์กันเอง หรือกดเข้า Google Meet ของห้องคุณได้ทันที
          </p>

          <form action={withBase("/sheets")} role="search" className={`${rise} mt-7 flex max-w-[32rem] items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-brand ring-1 ring-line [animation-delay:240ms]`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="size-5 shrink-0 text-primary" aria-hidden>
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
            </svg>
            <label htmlFor="hero-q" className="sr-only">ค้นหาชีทสรุป</label>
            <input
              id="hero-q"
              type="search"
              name="q"
              maxLength={100}
              placeholder="ค้นหาชีท เช่น การเคลื่อนที่"
              className="min-w-0 flex-1 bg-transparent py-2 text-ink outline-none placeholder:text-body/50"
            />
            <button type="submit" className="btn-primary btn-sm shrink-0 !shadow-none">ค้นหา</button>
          </form>

          <ul className={`${rise} mt-4 flex flex-wrap gap-2 [animation-delay:300ms]`} aria-label="ชีทตามระดับชั้น">
            {GRADES.map((g) => (
              <li key={g.value}>
                <Link
                  href={`/sheets?grade=${g.value}`}
                  className="block rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-primary ring-1 ring-line transition hover:bg-primary hover:text-white hover:ring-primary"
                >
                  {g.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <HeroVisual newest={newest} />
      </div>
    </section>
  );
}

function HeroVisual({ newest }: { newest?: SheetCardData }) {
  const delay = (d: string) => ({ animationDelay: d });
  return (
    <div className="@container relative hidden w-[min(420px,100%)] self-end justify-self-center sm:block min-[901px]:justify-self-end">
      {/* solid arch behind the student, thin outline arch for depth */}
      <span aria-hidden className="absolute right-[-6%] bottom-0 left-[16%] h-[74%] rounded-t-full bg-primary motion-safe:animate-rise" style={delay("0.05s")} />
      <span aria-hidden className="absolute right-[-14%] bottom-0 left-[8%] h-[82%] rounded-t-full border-2 border-primary/15" />
      <span aria-hidden className="absolute top-[18%] left-[4%] size-[11cqw] rounded-full bg-accent motion-safe:animate-pop-in" style={delay("0.4s")} />

      <img
        className="relative w-full motion-safe:animate-rise"
        style={delay("0.15s")}
        src={withBase("/img/hero-720.webp")}
        srcSet={`${withBase("/img/hero-480.webp")} 480w, ${withBase("/img/hero-720.webp")} 720w, ${withBase("/img/hero-960.webp")} 960w`}
        sizes="(min-width: 1024px) 420px, (min-width: 640px) 60vw, 0px"
        width={720}
        height={1084}
        alt=""
        fetchPriority="high"
        decoding="async"
      />

      {/* The newest real sheet, floating over the photo */}
      {newest && (
        <Link
          href={`/sheets/${newest.id}`}
          className="absolute bottom-[12%] left-[-8%] flex w-[min(270px,72%)] items-center gap-3 rounded-2xl bg-white p-2.5 pr-4 shadow-brand-lg ring-1 ring-line motion-safe:animate-rise"
          style={delay("0.55s")}
        >
          <img src={newest.cover.small} alt="" width={640} height={360} className="aspect-[4/3] w-16 shrink-0 rounded-xl object-cover" />
          <span className="min-w-0">
            <span className="block text-[11px] font-semibold tracking-wide text-sky">ชีทใหม่ล่าสุด</span>
            <span className="line-clamp-2 text-sm leading-snug font-semibold text-ink">{newest.title}</span>
          </span>
        </Link>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Stats({ sheets, views, authors }: { sheets: number; views: number; authors: number }) {
  const items = [
    { value: sheets, label: "ชีทที่เผยแพร่" },
    { value: views, label: "ครั้งที่ถูกเปิดอ่าน" },
    { value: authors, label: "นักเรียนที่ร่วมแชร์" },
    { value: ROOMS, label: "ห้องเรียนออนไลน์" },
  ];
  return (
    <section aria-label="ตัวเลขของ Connext Learning" className="bg-primary text-white">
      <dl className="container-page grid grid-cols-2 gap-y-6 py-8 md:grid-cols-4 md:py-10">
        {items.map((it) => (
          <div key={it.label} className="text-center md:border-l md:border-white/15 md:first:border-l-0">
            <dd className="text-[clamp(1.8rem,3.4vw,2.4rem)] leading-none font-bold">{formatNumber(it.value)}</dd>
            <dt className="mt-2 text-sm text-white/80">{it.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

function SectionHead({ id, title, sub, href, linkLabel }: { id: string; title: string; sub?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 id={id} className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold text-primary-800">{title}</h2>
        {sub && <p className="mt-1">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="group inline-flex items-center gap-1.5 font-semibold text-primary">
          {linkLabel} <span aria-hidden className="transition group-hover:translate-x-1">→</span>
        </Link>
      )}
    </div>
  );
}

function ByGrade() {
  return (
    <section id="sheets" aria-labelledby="grade-title" className="py-[clamp(56px,8vw,88px)]">
      <div className="container-page">
        <SectionHead id="grade-title" title="ชีทสรุปแยกตามชั้น" sub="กดที่ชั้นของคุณ แล้วกรองวิชาต่อได้" href="/sheets" linkLabel="ชีททั้งหมด" />
        {/* One row: swipe sideways on phones, 8 across on desktop */}
        <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0 lg:grid lg:grid-cols-8 lg:overflow-visible lg:pb-0">
          {BY_GRADE.map((f) => (
            <li key={f.img} className="w-[38%] shrink-0 snap-start sm:w-[22%] lg:w-auto">
              <Link
                href={`/sheets?${f.q}`}
                className="block aspect-[4/5] overflow-hidden rounded-xl bg-primary-50 shadow-card ring-1 ring-line/60 transition duration-300 hover:-translate-y-1 hover:shadow-brand"
              >
                <img src={withBase(`/img/sheets/sheet-${f.img}.webp`)} width={480} height={600} alt={f.alt} loading="lazy" decoding="async" className="size-full object-cover" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Latest({ sheets }: { sheets: SheetCardData[] }) {
  return (
    <section aria-labelledby="latest-title" className="pb-[clamp(56px,8vw,88px)]">
      <div className="container-page">
        <SectionHead id="latest-title" title="เพิ่งเผยแพร่" sub="ทุกชีทผ่านการตรวจจากสภานักเรียนก่อนขึ้นเว็บ" href="/sheets" linkLabel="ดูเพิ่ม" />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {sheets.map((s) => (
            <li key={s.id}><SheetCard sheet={s} /></li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function ClassroomSection() {
  return (
    <section
      id="classroom"
      aria-labelledby="classroom-title"
      className="bg-primary-50 bg-[radial-gradient(600px_300px_at_100%_0%,rgb(3_160_219/0.10),transparent_70%)] py-[clamp(56px,8vw,88px)]"
    >
      <div className="container-page">
        <SectionHead id="classroom-title" title="ห้องเรียนออนไลน์" sub="เลือกชั้น แล้วกดห้องของคุณเพื่อเข้า Google Meet" />
        <ClassroomPicker />
      </div>
    </section>
  );
}

function ShareBand() {
  const steps = ["อัปโหลด PDF หรือรูปถ่าย", "สภานักเรียนตรวจ", "ขึ้นเว็บพร้อมชื่อคุณ"];
  return (
    <section aria-labelledby="share-title" className="py-[clamp(56px,8vw,88px)]">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl bg-accent px-6 py-10 sm:px-10 md:px-14 md:py-12">
          <span aria-hidden className="absolute -top-16 -right-16 size-56 rounded-full border-[28px] border-white/25" />
          <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 id="share-title" className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold text-primary-800">มีชีทดี ๆ อยากแบ่งปัน?</h2>
              <ol className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 font-medium text-ink">
                {steps.map((s, i) => (
                  <li key={s} className="flex items-center gap-2">
                    <span className="grid size-6 place-items-center rounded-full bg-primary-800 text-xs font-bold text-white">{i + 1}</span>
                    {s}
                    {i < steps.length - 1 && <span aria-hidden className="ml-1 hidden text-ink/40 sm:inline">→</span>}
                  </li>
                ))}
              </ol>
            </div>
            <Link href="/sheets/upload" className="btn-primary shrink-0">
              แชร์ชีทของคุณ
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
