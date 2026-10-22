import Link from "next/link";
import { withBase } from "@/lib/urls";
import { ClassroomPicker } from "@/components/classroom-picker";
import { Avatar } from "@/components/avatar";
import { EyeIcon } from "@/components/sheet-card";
import { getContributors, getHomeMedia, getMostRead, getNews, getSiteStats, type Contributor, type SheetCardData } from "@/lib/queries";
import { bannerSrc, customCover, GRADE_ART, gradeArt, videoUrl } from "@/lib/covers";
import { NewsGrid } from "@/components/news-grid";
import { BannerCarousel } from "@/components/banner-carousel";
import { gradeLabel } from "@/lib/constants";
import { formatNumber, formatThaiDate } from "@/lib/format";
import { CountUp } from "@/components/count-up";
import { Typewriter } from "@/components/typewriter";
import { AutoVideo } from "@/components/auto-video";

// Static page, refreshed every 5 minutes (all data comes from cached queries)
export const revalidate = 300;


export default async function HomePage() {
  const [stats, contributors, mostRead, media, news] = await Promise.all([
    getSiteStats(),
    getContributors(30),
    getMostRead(5),
    getHomeMedia(),
    getNews().catch(() => null),
  ]);

  return (
    <>
      <Hero />
      {(media.videoKey || media.videoMobileKey) && (
        <HomeVideo
          sources={[
            // landscape for computers and tablets, portrait for phones (either one alone works everywhere)
            ...(media.videoKey && media.videoMobileKey ? [{ src: videoUrl(media.videoKey), media: "(min-width: 768px)" }] : []),
            { src: videoUrl((media.videoMobileKey ?? media.videoKey)!) },
          ]}
        />
      )}
      <Stats sheets={stats.sheets} views={stats.views} authors={stats.authors} users={stats.users} />
      {contributors.length > 0 && <Contributors people={contributors} />}
      <MostRead items={mostRead} />
      <ByGrade art={media.gradeArt} />
      {media.banners.length > 0 && (
        <BannerCarousel
          banners={media.banners.map((b) => ({ id: b.id, ...bannerSrc(b.imageKey), linkUrl: b.linkUrl }))}
        />
      )}
      {news && news.posts.length > 0 && <NewsSection posts={news.posts.slice(0, 4)} />}
      <ClassroomSection />
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
            <Typewriter
              segments={[
                { text: "Learn & Share", strong: true },
                { text: " แลกเปลี่ยนชีทสรุปทุกวิชา ม.1–ม.6 หรือกดเข้าห้องเรียนออนไลน์ผ่าน Google Meet" },
              ]}
            />
          </p>
          <div style={at(240)} className={`${rise} flex flex-wrap justify-center gap-3 sm:gap-4 min-[901px]:justify-start`}>
            <Link href="/sheets" className="btn-primary min-h-11 px-6 py-2 text-[15px] sm:min-w-[176px] sm:px-8">ดูชีทสรุป</Link>
            <a href="#classroom" className="btn-outline min-h-11 px-6 py-2 text-[15px] sm:min-w-[176px] sm:px-8">เข้าห้องเรียน</a>
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
      {/* arch behind the student: sky-to-blue gradient with a slow sweep of light (.hero-sheen) */}
      <span className="absolute right-[-6%] bottom-0 left-[20%] z-0 h-[72%] overflow-hidden rounded-t-full bg-[linear-gradient(165deg,#9fd8ff_0%,#4f9bf7_38%,#254ce9_78%,#1d3dc4_100%)] motion-safe:animate-rise" style={delay("0.05s")}>
        <span className="hero-sheen" />
      </span>
      <span className="absolute right-[-14%] bottom-0 left-[12%] z-0 h-[80%] rounded-t-full border-2 border-primary/15" />
      <span className="absolute top-[20%] left-[6%] z-[1] size-[13cqw] rounded-full bg-[#7cc8ff] motion-safe:animate-pop-in" style={delay("0.4s")} />
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

function Stats({ sheets, views, authors, users }: { sheets: number; views: number; authors: number; users: number }) {
  const items = [
    { value: sheets, label: "ชีทที่เผยแพร่" },
    { value: views, label: "ครั้งที่เปิดอ่าน" },
    { value: authors, label: "นักเรียนที่ร่วมแชร์" },
    { value: users, label: "ผู้ใช้ในระบบ" },
  ];
  return (
    <section aria-label="ตัวเลขของ Connext Learning" className="bg-white pt-[clamp(28px,4vw,48px)]">
      <div className="container-page">
        <dl className="relative grid grid-cols-2 gap-x-4 gap-y-6 overflow-hidden rounded-2xl bg-white px-6 py-6 ring-1 ring-line sm:px-10 md:grid-cols-4 md:py-7">
          <span aria-hidden className="absolute -top-12 -left-12 size-28 rounded-full border-[6px] border-primary-50" />
          <span aria-hidden className="absolute -right-10 -bottom-16 size-32 rounded-full border-[6px] border-primary-50" />
          {items.map((it) => (
            <div key={it.label} className="relative flex flex-col items-center gap-1.5 text-center">
              <dt className="order-2 text-sm leading-tight">{it.label}</dt>
              <dd className="order-1 text-[clamp(1.6rem,3vw,2.2rem)] leading-none font-bold text-ink"><CountUp value={it.value} /></dd>
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
        <p className="text-sm font-medium text-body/80 sm:text-base">พร้อมทุกสนามสอบ</p>
        <h2 id="people-title" className="mt-2 text-[clamp(1.75rem,4.6vw,3rem)] leading-tight font-bold text-ink">
          <span className="text-primary">‘อ่านชีท แชร์ชีท’</span> ทุกที่ทุกเวลา
        </h2>
        <p className="mt-3 text-[clamp(1.05rem,2.2vw,1.5rem)] font-medium text-primary-800">
          ร่วมแชร์ชีทเพื่อขึ้นหน้าเว็บไซต์
        </p>
      </div>
      <div className="group space-y-3 sm:space-y-4 [mask-image:linear-gradient(90deg,transparent,#000_6%,#000_94%,transparent)]">
        {rows.map((row, r) => {
          const looped = loopRow(row);
          return (
            <ul
              key={r}
              className={`flex w-max gap-3 sm:gap-4 group-hover:[animation-play-state:paused] ${r === 0 ? "motion-safe:animate-marquee" : "motion-safe:animate-marquee-reverse"}`}
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
      // Vivid blue fading to airy light blue, with a soft glow in the corner
      className="relative isolate flex h-[96px] w-[248px] items-center gap-3 overflow-hidden rounded-2xl bg-[linear-gradient(100deg,#254ce9_0%,#3462ef_50%,#5f93f6_100%)] px-4 text-white shadow-card transition hover:brightness-105 sm:h-[160px] sm:w-[360px] sm:gap-5 sm:px-6"
    >
      <span aria-hidden className="absolute -right-10 -bottom-16 -z-10 size-44 rounded-full bg-[#9fd0ff]/35 blur-2xl" />
      <span className="shrink-0 rounded-full bg-white p-0.5 shadow-[0_6px_20px_rgb(16_26_77/0.25)] sm:p-1">
        <span className="sm:hidden"><Avatar name={person.name} image={person.image} size={56} /></span>
        <span className="hidden sm:block"><Avatar name={person.name} image={person.image} size={84} /></span>
      </span>
      <span className="min-w-0">
        <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-sm sm:px-3 sm:text-xs">แชร์ {person.sheets} ชีท</span>
        <span className="mt-1 block truncate text-base font-bold sm:mt-1.5 sm:text-xl">{shortName(person.name)}</span>
        {person.classLabel && <span className="block truncate text-xs text-white/90 sm:text-sm">{person.classLabel}</span>}
      </span>
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Leaderboards
// ---------------------------------------------------------------------------

function MostRead({ items }: { items: SheetCardData[] }) {
  return (
    <section aria-labelledby="board-title" className="bg-primary-50 py-[clamp(48px,7vw,80px)]">
      <div className="container-page">
        <SectionHead id="board-title" title="ชีทยอดนิยม" href="/sheets?sort=popular" linkLabel="ดูทั้งหมด" />
        <Chart
          items={items}
          empty="ยังไม่มีชีทที่เผยแพร่"
          metric={(s) => (
            <>
              <EyeIcon className="size-4 text-primary" /> {formatNumber(s.viewCount)}
            </>
          )}
        />
      </div>
    </section>
  );
}

// Rank numerals: the theme blues for the top three, then quiet
const RANK_COLOR = ["text-primary", "text-sky", "text-[#6aa8ff]"];

/** Top-charts list: the leader as a cover card, the rest as rows with big rank numbers. */
function Chart({ items, metric, empty }: { items: SheetCardData[]; metric: (s: SheetCardData) => React.ReactNode; empty: string }) {
  const [first, ...rest] = items;
  return (
    <div className="card p-5 sm:p-6 lg:p-8">
      {!first ? (
        <p className="rounded-xl bg-primary-50/60 px-4 py-10 text-center text-sm">{empty}</p>
      ) : (
        // wide screens: a narrower leader on the left, the runners-up stretched to the same height beside it
        <div className="lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
          <Link href={`/sheets/${first.id}`} className="group grid gap-4 sm:grid-cols-[1.1fr_1fr] sm:items-center lg:grid-cols-1 lg:items-start">
            <span className="relative block overflow-hidden rounded-2xl">
              <img src={first.cover.small} srcSet={`${first.cover.small} 640w, ${first.cover.large} 1280w`} sizes="(min-width: 1024px) 560px, 90vw" alt="" width={640} height={360} loading="lazy" className="aspect-video w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
              <span className="absolute top-3 left-3 rounded-full bg-white/95 px-2.5 py-0.5 text-xs font-bold text-ink shadow-sm">อันดับ 1</span>
            </span>
            <span className="min-w-0">
              <span className="line-clamp-2 text-lg leading-snug font-semibold text-ink group-hover:text-primary">{first.title}</span>
              <span className="mt-1 block text-sm">{first.subjectName} · {gradeLabel(first.grade)}</span>
              <span className="mt-3 flex items-center gap-2 text-sm">
                <Avatar name={first.author.name} image={first.author.image} size={24} />
                <span className="min-w-0 truncate">โดย <span className="font-medium text-ink">{first.author.name}</span></span>
                <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-semibold text-ink">{metric(first)}</span>
              </span>
            </span>
          </Link>
          {rest.length > 0 && (
            <ol start={2} className="mt-5 divide-y divide-line border-t border-line lg:mt-0 lg:flex lg:flex-col lg:border-t-0">
              {rest.map((s, i) => (
                <li key={s.id} className="lg:flex lg:flex-1">
                  <Link href={`/sheets/${s.id}`} className="group flex items-center gap-4 py-3 lg:w-full lg:py-2">
                    <span className={`w-8 shrink-0 text-center text-3xl leading-none font-extrabold tabular-nums ${RANK_COLOR[i + 1] ?? "text-primary/25"}`}>{i + 2}</span>
                    <img src={s.cover.small} alt="" width={640} height={360} loading="lazy" className="aspect-video w-20 shrink-0 rounded-lg object-cover lg:w-32" />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 font-semibold text-ink group-hover:text-primary">{s.title}</span>
                      <span className="block truncate text-xs">{s.subjectName} · {gradeLabel(s.grade)} · โดย {s.author.name}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-ink">{metric(s)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sheets by grade, classrooms, share
// ---------------------------------------------------------------------------

function SectionHead({ id, title, sub, href, linkLabel }: { id: string; title: string; sub?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-4">
        <h2 id={id} className="text-[clamp(1.5rem,3vw,2.2rem)] font-bold text-primary-800">{title}</h2>
        {href && (
          <Link href={href} className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold whitespace-nowrap text-primary sm:text-base">
            {linkLabel} <span aria-hidden className="transition group-hover:translate-x-1">→</span>
          </Link>
        )}
      </div>
      {sub && <p className="mt-1">{sub}</p>}
    </div>
  );
}

function ByGrade({ art }: { art: Record<number, string> }) {
  return (
    <section id="sheets" aria-labelledby="grade-title" className="py-[clamp(56px,8vw,88px)]">
      <div className="container-page">
        <SectionHead id="grade-title" title="ชีทสรุปแยกตามชั้น" href="/sheets" linkLabel="ชีททั้งหมด" />
        {/* Phones: swipe sideways · tablets and computers: 3 per row, 2 rows */}
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-[clamp(14px,2vw,24px)] sm:overflow-visible sm:px-0 sm:pb-0">
          {GRADE_ART.map((f) => (
            <li key={f.slot} className="w-[68%] shrink-0 snap-center sm:w-auto">
              <Link
                href={`/sheets?${f.q}`}
                className="block aspect-[4/5] overflow-hidden rounded-2xl bg-primary-50 shadow-card ring-1 ring-line/60 transition duration-300 hover:-translate-y-1 hover:shadow-brand-lg"
              >
                <img
                  {...gradeArt(f.slot, art[f.slot])}
                  sizes="(min-width: 1264px) 400px, (min-width: 640px) 32vw, 68vw"
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
        <SectionHead id="classroom-title" title="ห้องเรียนออนไลน์" />
        <ClassroomPicker />
      </div>
    </section>
  );
}

function NewsSection({ posts }: { posts: NonNullable<Awaited<ReturnType<typeof getNews>>>["posts"] }) {
  return (
    <section aria-labelledby="news-title" className="py-[clamp(56px,8vw,88px)]">
      <div className="container-page">
        <SectionHead id="news-title" title="ข่าวสารการศึกษา" href="/news" linkLabel="ดูทั้งหมด" />
        <NewsGrid
          filters={false}
          categories={[]}
          items={posts.map((p) => ({
            id: p.id,
            title: p.title,
            summary: p.summary,
            category: p.category,
            linkUrl: p.linkUrl,
            linkLabel: p.linkLabel ?? null,
            date: formatThaiDate(p.publishedAt),
            dateTime: p.publishedAt,
            image: p.imageKey ? customCover(p.imageKey) : null,
          }))}
        />
      </div>
    </section>
  );
}

/**
 * Straight after the hero, pinned while you scroll: the page darkens like house
 * lights going down, the video grows from a small tilted card to a full-width frame,
 * the big title drifts away behind it and the glows burst outwards (CSS scroll
 * timeline, .hv* in globals.css). Without support / with reduced motion: a plain
 * dark section with the video.
 */
function HomeVideo({ sources }: { sources: { src: string; media?: string }[] }) {
  return (
    <section aria-labelledby="video-title" className="hv">
      <div className="hv-pin">
        <div aria-hidden className="hv-dark" />
        <span aria-hidden className="hv-glow hv-glow-a" />
        <span aria-hidden className="hv-glow hv-glow-b" />
        <span aria-hidden className="hv-glow hv-glow-c" />
        <h2 id="video-title" className="hv-title">
          รู้จัก <span className="text-[#7cc8ff]">Connext</span> Learning
        </h2>
        <div className="hv-frame">
          <AutoVideo src={sources} className="hv-video block aspect-video w-full bg-ink object-cover" />
        </div>
      </div>
    </section>
  );
}
