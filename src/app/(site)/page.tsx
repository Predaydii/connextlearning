import Link from "next/link";
import { withBase } from "@/lib/urls";
import { ClassroomPicker } from "@/components/classroom-picker";
import { Avatar } from "@/components/avatar";
import { EyeIcon } from "@/components/sheet-card";
import { getContributors, getLeaderboards, getSiteStats, type Contributor, type RankedSheet } from "@/lib/queries";
import { GRADES, gradeLabel } from "@/lib/constants";
import { classroomsOf } from "@/lib/classrooms";
import { formatNumber } from "@/lib/format";

// Static page, refreshed every 2 minutes (all data comes from cached queries)
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
  const [stats, contributors, boards] = await Promise.all([getSiteStats(), getContributors(30), getLeaderboards(5)]);

  return (
    <>
      <Hero />
      <Stats sheets={stats.sheets} views={stats.views} authors={stats.authors} />
      {contributors.length > 0 && <Contributors people={contributors} />}
      <Leaderboards topRated={boards.topRated} mostRead={boards.mostRead} />
      <ByGrade />
      <ClassroomSection />
      <ShareBand />
    </>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
  const rise = "motion-safe:animate-rise";
  return (
    <section id="home" className="relative overflow-hidden bg-white">
      <div className="container-page grid items-center gap-3 pt-10 text-center md:pt-14 min-[901px]:grid-cols-[1.05fr_1fr] min-[901px]:gap-10 min-[901px]:text-left lg:pt-[72px]">
        <div className="pb-2 min-[901px]:pb-20">
          <p className={`${rise} mb-3.5 inline-flex items-center gap-2 text-lg font-semibold text-primary-800 before:h-1 before:w-7 before:rounded before:bg-sky`}>
            โรงเรียนตราษตระการคุณ
          </p>
          <h1 className={`${rise} isolate mb-5 text-[clamp(1.8rem,8.4vw,2.2rem)] font-bold tracking-tight text-primary-800 [animation-delay:80ms] sm:text-[clamp(2.1rem,4.6vw,3.6rem)]`}>
            CONNEXT LEARNING
            <br />
            FOR{" "}
            <span className="relative whitespace-nowrap text-primary after:absolute after:-inset-x-[0.08em] after:bottom-[0.1em] after:-z-10 after:h-[0.45em] after:origin-left after:rounded-[0.12em] after:bg-sky/30 motion-safe:after:animate-highlight">
              ALL LEARNERS
            </span>
          </h1>
          <p className={`${rise} mx-auto mb-8 max-w-[520px] text-[1.05rem] [animation-delay:160ms] min-[901px]:mx-0`}>
            <strong className="font-semibold text-ink">Learn &amp; Share</strong> แลกเปลี่ยนชีทสรุปทุกวิชา ม.1–ม.6
            หรือกดเข้าห้องเรียนออนไลน์ผ่าน Google Meet
          </p>
          <div className={`${rise} flex flex-wrap justify-center gap-4 [animation-delay:240ms] min-[901px]:justify-start`}>
            <Link href="/sheets" className="btn-primary min-w-0 flex-[1_1_140px] sm:min-w-[180px] sm:flex-none">ดูชีทสรุป</Link>
            <a href="#classroom" className="btn-outline min-w-0 flex-[1_1_140px] sm:min-w-[180px] sm:flex-none">เข้าห้องเรียน</a>
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

function HeroVisual() {
  const delay = (d: string) => ({ animationDelay: d });
  return (
    <div className="@container relative w-[min(420px,86%)] self-end justify-self-center min-[901px]:w-[min(460px,100%)]" aria-hidden>
      <span className="absolute right-[-6%] bottom-0 left-[20%] z-0 h-[72%] rounded-t-full bg-primary motion-safe:animate-rise" style={delay("0.05s")} />
      <span className="absolute right-[-14%] bottom-0 left-[12%] z-0 h-[80%] rounded-t-full border-2 border-primary/15" />
      <span className="absolute top-[20%] left-[6%] z-[1] size-[13cqw] rounded-full bg-accent motion-safe:animate-pop-in" style={delay("0.4s")} />
      <span className="absolute right-[-2%] top-[16%] z-[1] size-[5cqw] rounded-full bg-sky motion-safe:animate-pop-in" style={delay("0.5s")} />
      <img
        className="relative z-[2] w-full motion-safe:animate-rise"
        style={delay("0.15s")}
        src={withBase("/img/hero-720.webp")}
        srcSet={`${withBase("/img/hero-480.webp")} 480w, ${withBase("/img/hero-720.webp")} 720w, ${withBase("/img/hero-960.webp")} 960w`}
        sizes="(min-width: 1024px) 460px, (min-width: 768px) 44vw, 86vw"
        width={720}
        height={1084}
        alt=""
        fetchPriority="high"
        decoding="async"
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Numbers (real data only)
// ---------------------------------------------------------------------------

function Stats({ sheets, views, authors }: { sheets: number; views: number; authors: number }) {
  const items = [
    { value: sheets, label: ["ชีทสรุป", "ที่เผยแพร่แล้ว"] },
    { value: views, label: ["ครั้งที่", "เปิดอ่าน"] },
    { value: authors, label: ["นักเรียน", "ที่ร่วมแชร์"] },
    { value: ROOMS, label: ["ห้องเรียน", "ออนไลน์"] },
  ];
  return (
    <section aria-label="ตัวเลขของ Connext Learning" className="bg-white pt-[clamp(28px,4vw,48px)]">
      <div className="container-page">
        <dl className="relative grid grid-cols-2 gap-x-4 gap-y-6 overflow-hidden rounded-2xl bg-white px-6 py-6 ring-1 ring-line sm:px-10 md:grid-cols-4 md:py-7">
          <span aria-hidden className="absolute -top-12 -left-12 size-28 rounded-full border-[6px] border-primary-50" />
          <span aria-hidden className="absolute -right-10 -bottom-16 size-32 rounded-full border-[6px] border-primary-50" />
          {items.map((it) => (
            <div key={it.label.join("")} className="relative flex items-center justify-center gap-3">
              <dt className="order-2 text-sm leading-tight">{it.label[0]}<br />{it.label[1]}</dt>
              <dd className="order-1 text-[clamp(1.6rem,3vw,2.2rem)] leading-none font-bold text-ink">{formatNumber(it.value)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Contributors: two endless rows of the students who share sheets
// ---------------------------------------------------------------------------

/** "ปัณณวัฒน์ ใจดี" → "ปัณณวัฒน์ ใ." (surname initial only) */
function shortName(name: string) {
  const [first, last] = name.trim().split(/\s+/);
  return last ? `${first} ${[...last][0]}.` : first;
}

/** Repeat the list until a row is long enough to look endless, then double it for the loop. */
function loopRow<T>(items: T[], min = 8) {
  const row = [...items];
  while (row.length < min) row.push(...items);
  return [...row, ...row];
}

function Contributors({ people }: { people: Contributor[] }) {
  const half = Math.ceil(people.length / 2);
  const rows = people.length > 6 ? [people.slice(0, half), people.slice(half)] : [people, [...people].reverse()];
  return (
    <section aria-labelledby="people-title" className="overflow-hidden py-[clamp(48px,7vw,80px)]">
      <div className="container-page mb-8">
        <SectionHead id="people-title" title="คนแชร์ชีท" sub="ขอบคุณนักเรียนทุกคนที่ส่งชีทสรุปให้เพื่อน ๆ" />
      </div>
      <div className="group space-y-4 [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
        {rows.map((row, r) => {
          const looped = loopRow(row);
          return (
            <ul
              key={r}
              className={`flex w-max gap-4 group-hover:[animation-play-state:paused] ${r === 0 ? "motion-safe:animate-marquee" : "motion-safe:animate-marquee-reverse"}`}
            >
              {looped.map((p, i) => {
                // The second half repeats the first; keep it out of the tab order and screen readers
                const copy = i >= looped.length / 2;
                return (
                  <li key={`${p.id}-${i}`} aria-hidden={copy || undefined}>
                    <PersonCard person={p} hidden={copy} />
                  </li>
                );
              })}
            </ul>
          );
        })}
      </div>
    </section>
  );
}

function PersonCard({ person, hidden }: { person: Contributor; hidden: boolean }) {
  return (
    <Link
      href={`/u/${person.id}`}
      tabIndex={hidden ? -1 : undefined}
      className="flex h-[112px] w-[290px] items-center gap-4 rounded-2xl bg-[linear-gradient(120deg,#203cc7_0%,#2f55e4_55%,#4f7cf0_100%)] px-5 text-white shadow-card transition hover:brightness-110"
    >
      <span className="shrink-0 rounded-full bg-white p-1">
        <Avatar name={person.name} image={person.image} size={64} />
      </span>
      <span className="min-w-0">
        <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">แชร์ {person.sheets} ชีท</span>
        <span className="mt-1 block truncate text-lg font-bold">{shortName(person.name)}</span>
        {person.lastSubject && <span className="block truncate text-sm text-white/80">ล่าสุด: {person.lastSubject}</span>}
      </span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Leaderboards
// ---------------------------------------------------------------------------

function Leaderboards({ topRated, mostRead }: { topRated: RankedSheet[]; mostRead: RankedSheet[] }) {
  return (
    <section aria-labelledby="board-title" className="bg-primary-50 py-[clamp(48px,7vw,80px)]">
      <div className="container-page">
        <SectionHead id="board-title" title="ชีทยอดนิยม" href="/sheets?sort=popular" linkLabel="ดูทั้งหมด" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Board
            title="ได้ดาวมากที่สุด"
            items={topRated}
            empty="ยังไม่มีใครให้ดาว อ่านแล้วกดให้ดาวชีทที่ชอบได้เลย"
            metric={(s) => (
              <span className="flex items-center gap-1 font-semibold text-ink">
                <span className="text-accent">★</span>
                {s.score?.toFixed(1)}
                <span className="text-xs font-normal text-body">({s.ratings})</span>
              </span>
            )}
          />
          <Board
            title="มีคนอ่านมากที่สุด"
            items={mostRead}
            empty="ยังไม่มีชีทที่เผยแพร่"
            metric={(s) => (
              <span className="flex items-center gap-1 font-semibold text-ink">
                <EyeIcon className="size-4 text-primary" />
                {formatNumber(s.viewCount)}
              </span>
            )}
          />
        </div>
      </div>
    </section>
  );
}

const RANK_STYLE = ["bg-accent text-ink", "bg-primary text-white", "bg-sky text-white"];

function Board({ title, items, metric, empty }: { title: string; items: RankedSheet[]; metric: (s: RankedSheet) => React.ReactNode; empty: string }) {
  return (
    <div className="card p-5 sm:p-6">
      <h3 className="mb-4 text-lg font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="rounded-xl bg-primary-50/60 px-4 py-8 text-center text-sm">{empty}</p>
      ) : (
        <ol className="divide-y divide-line">
          {items.map((s, i) => (
            <li key={s.id}>
              <Link href={`/sheets/${s.id}`} className="group flex items-center gap-3 py-3">
                <span className={`grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold ${RANK_STYLE[i] ?? "bg-primary-50 text-primary"}`}>{i + 1}</span>
                <img src={s.cover.small} alt="" width={640} height={360} loading="lazy" className="aspect-video w-20 shrink-0 rounded-lg object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 font-semibold text-ink group-hover:text-primary">{s.title}</span>
                  <span className="block text-xs">{s.subjectName} · {gradeLabel(s.grade)}</span>
                </span>
                <span className="shrink-0 text-sm">{metric(s)}</span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sheets by grade, classrooms, share
// ---------------------------------------------------------------------------

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
        {/* Phones: swipe sideways · tablets and computers: 4 per row, 2 rows */}
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-[clamp(14px,2vw,24px)] sm:overflow-visible sm:px-0 sm:pb-0">
          {BY_GRADE.map((f) => (
            <li key={f.img} className="w-[68%] shrink-0 snap-center sm:w-auto">
              <Link
                href={`/sheets?${f.q}`}
                className="block aspect-[4/5] overflow-hidden rounded-2xl bg-primary-50 shadow-card ring-1 ring-line/60 transition duration-300 hover:-translate-y-1 hover:shadow-brand-lg"
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
            <Link href="/sheets/upload" className="btn-primary shrink-0">แชร์ชีทของคุณ</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
