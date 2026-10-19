import Link from "next/link";
import { withBase } from "@/lib/urls";
import { ClassroomPicker } from "@/components/classroom-picker";

// Promotional 4:5 artwork shown under the banner (replace files in /public/img/sheets)
const FEATURED = [
  { img: 1, alt: "ชีทสรุป ม.1", q: "grade=M1" },
  { img: 2, alt: "ชีทสรุป ม.2", q: "grade=M2" },
  { img: 3, alt: "ชีทสรุป ม.3", q: "grade=M3" },
  { img: 4, alt: "ชีทสรุป ม.4", q: "grade=M4" },
  { img: 5, alt: "ชีทสรุป ม.5", q: "grade=M5" },
  { img: 6, alt: "ชีทสรุป ม.6", q: "grade=M6" },
  { img: 7, alt: "ชีทสรุป วิชาอื่น ๆ ม.ต้น", q: "subject=other-lower" },
  { img: 8, alt: "ชีทสรุป วิชาอื่น ๆ ม.ปลาย", q: "subject=other-upper" },
];

export default function HomePage() {
  return (
    <>
      <Hero />
      <SheetsSection />
      <ClassroomSection />
    </>
  );
}

function Hero() {
  const rise = "motion-safe:animate-rise";
  return (
    <section
      id="home"
      className="relative overflow-hidden bg-white"
    >
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
              ALL LEARNER
            </span>
          </h1>
          <p className={`${rise} mx-auto mb-8 max-w-[520px] text-[1.05rem] [animation-delay:160ms] min-[901px]:mx-0`}>
            <strong className="font-semibold text-ink">Online Learning Space</strong> – พื้นที่แลกเปลี่ยนเรียนรู้และเชื่อมโยงระบบนิเวศการศึกษาของโรงเรียนตราษตระการคุณ
          </p>
          <div className={`${rise} flex flex-wrap justify-center gap-4 [animation-delay:240ms] min-[901px]:justify-start`}>
            <a href="#sheets" className="btn-outline min-w-0 flex-[1_1_140px] sm:min-w-[180px] sm:flex-none">ชีทสรุป</a>
            <a href="#classroom" className="btn-primary min-w-0 flex-[1_1_140px] sm:min-w-[180px] sm:flex-none">เข้าห้องเรียน</a>
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
    <div className="@container relative w-[min(420px,86%)] self-end justify-self-center min-[901px]:w-[min(480px,100%)]" aria-hidden>
      {/* solid arch behind the student */}
      <span
        className="absolute right-[-6%] bottom-0 left-[20%] z-0 h-[72%] rounded-t-full bg-primary motion-safe:animate-rise"
        style={delay("0.05s")}
      />
      {/* thin outline arch, offset for depth */}
      <span className="absolute right-[-14%] bottom-0 left-[12%] z-0 h-[80%] rounded-t-full border-2 border-primary/15" />
      {/* accent dot */}
      <span className="absolute top-[20%] left-[6%] z-[1] size-[13cqw] rounded-full bg-accent motion-safe:animate-pop-in" style={delay("0.4s")} />
      <span className="absolute right-[-2%] top-[16%] z-[1] size-[5cqw] rounded-full bg-sky motion-safe:animate-pop-in" style={delay("0.5s")} />

      <img
        className="relative z-[2] w-full motion-safe:animate-rise"
        style={delay("0.15s")}
        src={withBase("/img/hero-720.webp")}
        srcSet={`${withBase("/img/hero-480.webp")} 480w, ${withBase("/img/hero-720.webp")} 720w, ${withBase("/img/hero-960.webp")} 960w`}
        sizes="(min-width: 1024px) 480px, (min-width: 768px) 44vw, 86vw"
        width={720}
        height={1084}
        alt=""
        fetchPriority="high"
        decoding="async"
      />

    </div>
  );
}

function SheetsSection() {
  return (
    <section id="sheets" aria-labelledby="sheets-title" className="py-[clamp(56px,8vw,96px)]">
      <div className="container-page">
        <h2 id="sheets-title" className="section-title mb-9">แชร์ชีทสรุป</h2>

        <Link
          href="/sheets"
          aria-label="ดูชีทสรุปทั้งหมด"
          className="group mb-[clamp(20px,3vw,32px)] block aspect-[2000/600] overflow-hidden rounded-xl bg-primary-50 shadow-brand md:rounded-2xl"
        >
          <img
            src={withBase("/img/sheets/banner.webp")}
            srcSet={`${withBase("/img/sheets/banner-1000.webp")} 1000w, ${withBase("/img/sheets/banner.webp")} 2000w`}
            sizes="(min-width: 1264px) 1200px, 94vw"
            width={2000}
            height={600}
            alt="แชร์ชีทสรุป สรุปครบทุกวิชา ม.1 – ม.6"
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition duration-500 group-hover:scale-[1.02]"
          />
        </Link>

        <ul className="grid grid-cols-2 gap-[clamp(14px,2.2vw,24px)] md:grid-cols-4">
          {FEATURED.map((f) => (
            <li key={f.img}>
              <Link
                href={`/sheets?${f.q}`}
                className="block aspect-[4/5] overflow-hidden rounded-xl bg-primary-50 shadow-card transition duration-300 hover:-translate-y-1.5 hover:shadow-brand-lg md:rounded-2xl"
              >
                <img
                  src={withBase(`/img/sheets/sheet-${f.img}.webp`)}
                  width={480}
                  height={600}
                  alt={f.alt}
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
      className="bg-primary-50 bg-[radial-gradient(600px_300px_at_100%_0%,rgb(3_160_219/0.10),transparent_70%)] py-[clamp(56px,8vw,96px)]"
    >
      <div className="container-page">
        <h2 id="classroom-title" className="section-title mb-9">ห้องเรียนออนไลน์</h2>
        <ClassroomPicker />
      </div>
    </section>
  );
}
