import Link from "next/link";
import { withBase } from "@/lib/urls";
import { ClassroomPicker } from "@/components/classroom-picker";
import { Avatar } from "@/components/avatar";
import { EyeIcon } from "@/components/sheet-card";
import { getContributors, getHomeMedia, getLeaderboards, getSiteStats, type Contributor, type RankedSheet } from "@/lib/queries";
import { GRADE_ART, gradeArt, videoUrl } from "@/lib/covers";
import { GRADES, gradeLabel } from "@/lib/constants";
import { classroomsOf } from "@/lib/classrooms";
import { formatNumber } from "@/lib/format";

// Static page, refreshed every 2 minutes (all data comes from cached queries)
export const revalidate = 120;

const ROOMS = GRADES.reduce((n, g) => n + classroomsOf(g.value).length, 0);

export default async function HomePage() {
  const [stats, contributors, boards, media] = await Promise.all([getSiteStats(), getContributors(30), getLeaderboards(5), getHomeMedia()]);

  return (
    <>
      <Hero />
      <Stats sheets={stats.sheets} views={stats.views} authors={stats.authors} />
      {contributors.length > 0 && <Contributors people={contributors} />}
      <Leaderboards topRated={boards.topRated} mostRead={boards.mostRead} />
      <ByGrade art={media.gradeArt} />
      <ClassroomSection />
      <ShareBand />
      {media.videoKey && <HomeVideo src={videoUrl(media.videoKey)} />}
    </>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
  const rise = "motion-safe:animate-rise";
  // Waits for the opening animation on the first visit (--intro-delay, see globals.css)
  const at = (ms: number) => ({ animationDelay: `calc(var(--intro-delay) + ${ms}ms)` });
  return (
    <section id="home" className="relative overflow-hidden bg-white">
      <div className="container-page grid items-center gap-3 pt-10 text-center md:pt-14 min-[901px]:grid-cols-[1.05fr_1fr] min-[901px]:gap-10 min-[901px]:text-left lg:pt-[72px]">
        <div className="pb-2 min-[901px]:pb-20">
          <p style={at(0)} className={`${rise} mb-3.5 inline-flex items-center gap-2 text-lg font-semibold text-primary-800 before:h-1 before:w-7 before:rounded before:bg-sky`}>
            โรงเรียนตราษตระการคุณ
          </p>
          <h1 style={at(80)} className={`${rise} isolate mb-5 text-[clamp(1.8rem,8.4vw,2.2rem)] font-bold tracking-tight text-primary-800 sm:text-[clamp(2.1rem,4.6vw,3.6rem)]`}>
            CONNEXT LEARNING
            <br />
            FOR{" "}
            <span className="relative whitespace-nowrap text-primary after:absolute after:-inset-x-[0.08em] after:bottom-[0.1em] after:-z-10 after:h-[0.45em] after:origin-left after:rounded-[0.12em] after:bg-sky/30 motion-safe:after:animate-highlight">
              ALL LEARNERS
            </span>
          </h1>
          <p style={at(160)} className={`${rise} mx-auto mb-8 max-w-[520px] text-[1.05rem] min-[901px]:mx-0`}>
            <strong className="font-semibold text-ink">Learn &amp; Share</strong> แลกเปลี่ยนชีทสรุปทุกวิชา ม.1–ม.6
            หรือกดเข้าห้องเรียนออนไลน์ผ่าน Google Meet
          </p>
          <div style={at(240)} className={`${rise} flex flex-wrap justify-center gap-4 min-[901px]:justify-start`}>
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
  const delay = (d: string) => ({ animationDelay: `calc(var(--intro-delay) + ${d})` });
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
      <div className="container-page mb-10 text-center">
        <p className="text-sm font-medium text-body/80 sm:text-base">ขอบคุณเพื่อน ๆ ทุกคนที่แชร์ชีทสรุป</p>
        <h2 id="people-title" className="mt-2 text-[clamp(1.75rem,4.6vw,3rem)] leading-tight font-bold text-ink">
          พร้อมทุกสนามสอบ <span className="text-primary">‘อ่านชีท แชร์ชีท’</span> ทุกที่ทุกเวลา
        </h2>
        <p className="mt-3 text-[clamp(1.05rem,2.2vw,1.5rem)] font-medium text-ink">
          ตั้งแต่ <span className="text-primary">ม.1–ม.6</span> ไปจนถึง<span className="text-primary">การสอบแข่งขัน</span>
        </p>
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

function ByGrade({ art }: { art: Record<number, string> }) {
  return (
    <section id="sheets" aria-labelledby="grade-title" className="py-[clamp(56px,8vw,88px)]">
      <div className="container-page">
        <SectionHead id="grade-title" title="ชีทสรุปแยกตามชั้น" sub="กดที่ชั้นของคุณ แล้วกรองวิชาต่อได้" href="/sheets" linkLabel="ชีททั้งหมด" />
        {/* Phones: swipe sideways · tablets and computers: 4 per row, 2 rows */}
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-4 sm:gap-[clamp(14px,2vw,24px)] sm:overflow-visible sm:px-0 sm:pb-0">
          {GRADE_ART.map((f) => (
            <li key={f.slot} className="w-[68%] shrink-0 snap-center sm:w-auto">
              <Link
                href={`/sheets?${f.q}`}
                className="block aspect-[4/5] overflow-hidden rounded-2xl bg-primary-50 shadow-card ring-1 ring-line/60 transition duration-300 hover:-translate-y-1 hover:shadow-brand-lg"
              >
                <img
                  {...gradeArt(f.slot, art[f.slot])}
                  sizes="(min-width: 1264px) 300px, (min-width: 640px) 24vw, 68vw"
                  width={480}
                  height={600}
                  alt={`ชีทสรุป ${f.label}`}
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
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
      className="bg-primary-50 py-[clamp(56px,8vw,88px)]"
    >
      <div className="container-page">
        <SectionHead id="classroom-title" title="ห้องเรียนออนไลน์" sub="เลือกชั้น แล้วกดห้องของคุณ ระบบจะเปิด Google Meet ให้ทันที" />
        <ClassroomPicker />
      </div>
    </section>
  );
}

// The three steps light up one after another (6 s loop) while the bar fills, so the flow reads at a glance.
// Without motion every step simply shows in full.
const SHARE_STEPS = [
  { title: "อัปโหลด", desc: "ส่งไฟล์ PDF หรือรูปถ่ายชีทของคุณ", icon: <UploadArt /> },
  { title: "สภานักเรียนตรวจ", desc: "ตรวจความถูกต้องก่อนเผยแพร่", icon: <ReviewArt /> },
  { title: "ขึ้นเว็บพร้อมชื่อคุณ", desc: "เพื่อน ๆ อ่านและให้ดาวได้ทันที", icon: <PublishArt /> },
];

function ShareBand() {
  return (
    <section aria-labelledby="share-title" className="py-[clamp(56px,8vw,88px)]">
      <div className="container-page">
        <div className="share-band relative isolate overflow-hidden rounded-3xl px-5 py-10 text-white shadow-brand-lg sm:px-10 md:px-14 md:py-14">
          {/* drifting colour glows over the moving gradient */}
          <span aria-hidden className="absolute -top-20 -left-16 -z-10 size-72 rounded-full bg-accent/35 blur-3xl motion-safe:animate-drift" />
          <span aria-hidden className="absolute -right-20 -bottom-24 -z-10 size-80 rounded-full bg-[#7dd3fc]/40 blur-3xl motion-safe:animate-drift-slow" />
          <span aria-hidden className="absolute top-1/3 left-1/2 -z-10 size-56 rounded-full bg-[#f472b6]/25 blur-3xl motion-safe:animate-drift [animation-delay:-8s]" />
          <span aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(rgb(255_255_255/0.14)_1.2px,transparent_1.6px)] [background-size:22px_22px] motion-safe:animate-dots" />
          <div className="relative text-center">
            <h2 id="share-title" className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold text-white">มีชีทดี ๆ อยากแบ่งปัน?</h2>
            <p className="mt-2 text-white/90">แชร์ได้ใน 3 ขั้นตอน ชื่อของคุณจะอยู่บนชีทที่เพื่อน ๆ อ่าน</p>
          </div>

          <ol className="share-flow relative mt-10 grid gap-4 md:grid-cols-3 md:gap-6">
            {/* track between the step centres (desktop) */}
            <li aria-hidden className="absolute top-[50px] right-[16.66%] left-[16.66%] hidden h-1 rounded-full bg-white/25 md:block">
              <span className="share-fill block h-full rounded-full bg-accent" />
            </li>
            {SHARE_STEPS.map((s, i) => (
              <li key={s.title} className="share-step relative flex items-center gap-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 md:flex-col md:bg-transparent md:p-0 md:text-center md:ring-0">
                <span className="share-icon relative z-[1] grid size-[72px] shrink-0 place-items-center rounded-2xl bg-white text-primary shadow-[0_10px_30px_rgb(0_0_0/0.25)] md:size-[104px] md:rounded-3xl">
                  {s.icon}
                  <span className="absolute -top-2 -left-2 grid size-7 place-items-center rounded-full bg-accent text-sm font-bold text-ink">{i + 1}</span>
                </span>
                <span className="share-text">
                  <span className="block text-lg font-semibold text-white">{s.title}</span>
                  <span className="block text-sm text-white/85">{s.desc}</span>
                </span>
              </li>
            ))}
          </ol>

          <div className="relative mt-10 text-center">
            <Link href="/sheets/upload" className="btn border-accent bg-accent text-ink hover:brightness-105">
              แชร์ชีทของคุณ
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function UploadArt() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-10 md:size-14" aria-hidden>
      <path d="M12 30v8a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2v-8" />
      <g className="share-upload">
        <path d="M24 30V10" />
        <path d="m16 17 8-8 8 8" />
      </g>
    </svg>
  );
}

function ReviewArt() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-10 md:size-14" aria-hidden>
      <path d="M30 6H14a2 2 0 0 0-2 2v32a2 2 0 0 0 2 2h20a2 2 0 0 0 2-2V12z" />
      <path d="M30 6v6h6" />
      <path className="share-check text-sky" d="m18 26 5 5 9-10" pathLength={1} />
    </svg>
  );
}

function PublishArt() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-10 md:size-14" aria-hidden>
      <rect x="6" y="10" width="36" height="28" rx="3" />
      <circle cx="15" cy="20" r="3.5" />
      <path d="M22 18h13M22 23h9M12 31h24" />
      <path className="share-star fill-accent stroke-accent" d="m38 4 1.8 3.7 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6z" strokeWidth="1" />
    </svg>
  );
}

function HomeVideo({ src }: { src: string }) {
  return (
    <section aria-label="วิดีโอแนะนำ" className="pb-[clamp(56px,8vw,88px)]">
      <div className="container-page">
        <video
          src={src}
          controls
          playsInline
          preload="metadata"
          className="mx-auto aspect-video w-full max-w-5xl rounded-3xl bg-ink shadow-brand ring-1 ring-line/60"
        />
      </div>
    </section>
  );
}
