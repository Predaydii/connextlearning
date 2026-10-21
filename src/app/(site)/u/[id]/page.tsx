import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { SheetCard } from "@/components/sheet-card";
import { ShareButton } from "@/components/share-button";
import { SignOutButton } from "@/components/sign-out-button";
import { QrCode } from "@/components/qr-code";
import { PassImageButton } from "@/components/pass-image-button";
import { CONTACTS, readContacts } from "@/lib/contacts";
import { formatNumber, formatThaiDateShort } from "@/lib/format";
import { classLabel, getAuthorProfile } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata(props: PageProps<"/u/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const profile = await getAuthorProfile(id);
  // Student names: shown on the site, kept out of search engines
  return { title: profile ? `${profile.user.name}` : "ไม่พบผู้ใช้", robots: { index: false } };
}

export default async function AuthorProfilePage(props: PageProps<"/u/[id]">) {
  const { id } = await props.params;
  const [viewer, profile] = await Promise.all([getCurrentUser(), getAuthorProfile(id)]);
  if (!profile) notFound();
  const { user, sheets, totalViews } = profile;
  const isMe = viewer?.id === user.id;
  const label = classLabel(user);
  const contacts = readContacts(user.contacts);
  const links = CONTACTS.filter((c) => contacts[c.key]);
  // phones: three equal tiles (icon over label); wider screens: one row, sign-out on the right
  const tile = "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-xs font-medium transition sm:flex-row sm:gap-2 sm:px-4 sm:text-sm";
  const item = `${tile} text-ink hover:bg-primary-50 hover:text-primary`;
  const icon = (d: string) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="size-[18px]" aria-hidden><path d={d} /></svg>
  );

  const profileUrl = `${process.env.BETTER_AUTH_URL ? new URL(process.env.BETTER_AUTH_URL).origin : "https://connextlearning.tratcouncil.com"}/u/${user.id}`;
  const fields = [
    { k: "ชั้น / สถานะ", v: label ?? "สมาชิก" },
    { k: "ชีทที่แชร์", v: formatNumber(sheets.length) },
    { k: "ครั้งที่ถูกอ่าน", v: formatNumber(totalViews) },
  ];

  return (
    <div className="bg-primary-50">
      {/* top band: the boarding pass over drifting doodles */}
      <div className="relative isolate overflow-hidden pt-10 pb-12 md:pt-14 md:pb-16">
      <Doodles />
      <div className="container-page">
        {/* ---------- Boarding pass: every fact once (#boarding-pass is what "บันทึกรูป" captures) ---------- */}
        <div className="mx-auto max-w-[calc(48rem+2rem)] p-4">
        <section id="boarding-pass" aria-label={`บัตรโปรไฟล์ของ ${user.name}`} className="mx-auto flex max-w-3xl flex-col overflow-hidden rounded-[28px] bg-white shadow-brand-lg motion-safe:animate-rise md:flex-row">
          <div className="flex-1 p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-primary">Connext Learning</p>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.2em] text-body uppercase">
                Boarding pass
                <svg viewBox="0 0 24 24" className="size-4 rotate-90 fill-primary" aria-hidden>
                  <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
                </svg>
              </p>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <Avatar name={user.name} image={user.image} size={64} />
              <div className="min-w-0">
                <p className="text-xs text-body">ผู้เดินทาง</p>
                <h1 className="text-[clamp(1.4rem,3.4vw,1.9rem)] leading-tight font-bold break-words text-ink">
                  {/* wrap between first and last name, never inside a Thai word */}
                  {user.name.split(" ").map((w, i) => (
                    <span key={i}>{i > 0 && " "}<span className="inline-block max-w-full">{w}</span></span>
                  ))}
                </h1>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-3 gap-4 border-y border-dashed border-line py-5">
              {fields.map((f) => (
                <div key={f.k} className="min-w-0">
                  <dt className="text-xs text-body">{f.k}</dt>
                  <dd className="mt-0.5 truncate text-lg font-bold text-ink sm:text-xl">{f.v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-body">
                สมาชิกตั้งแต่ {formatThaiDateShort(user.createdAt)}
              </p>
              {links.length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="ช่องทางติดต่อ">
                  {links.map((c) => (
                    <li key={c.key}>
                      <a
                        href={c.href(contacts[c.key]!)}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        aria-label={c.label}
                        title={c.label}
                        className="grid size-9 place-items-center rounded-lg bg-primary-50 text-primary transition hover:bg-primary hover:text-white"
                      >
                        <svg viewBox="0 0 24 24" className="size-[18px] fill-current" aria-hidden><path d={c.icon} fillRule="evenodd" /></svg>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* perforation with a notch at each end */}
          <div aria-hidden className="relative border-t-2 border-dashed border-line md:border-t-0 md:border-l-2">
            <span className="absolute -top-3 -left-3 size-6 rounded-full bg-primary-50" />
            <span className="absolute -top-3 -right-3 size-6 rounded-full bg-primary-50 md:top-auto md:right-auto md:-bottom-3 md:-left-3" />
          </div>

          {/* stub: the profile's own QR code */}
          <div className="flex items-center gap-4 p-5 sm:gap-5 sm:p-8 md:w-60 md:flex-col md:justify-center md:text-center">
            <QrCode value={profileUrl} label={`QR code ลิงก์โปรไฟล์ของ ${user.name}`} className="size-28 shrink-0 rounded-xl ring-1 ring-line md:size-36" />
            <div className="grid min-w-0 flex-1 gap-3 md:w-full md:flex-none">
              <p className="text-xs text-body">สแกนเพื่อเปิดโปรไฟล์นี้</p>
              <span data-no-capture className="contents">
              <ShareButton
                path={`/u/${user.id}`}
                title={`${user.name} · Connext Learning`}
                text={`ดูชีทสรุปของ ${user.name} บน Connext Learning`}
                label="แชร์โปรไฟล์"
                className="btn-primary btn-sm cursor-pointer gap-2 whitespace-nowrap"
              />
              </span>
              <PassImageButton
                targetId="boarding-pass"
                fileName={`connext-boarding-pass-${user.id.slice(0, 6)}.png`}
                className="btn-outline btn-sm cursor-pointer gap-2"
              />
            </div>
          </div>
        </section>

        </div>

        {/* Your own profile: account actions */}
        {isMe && (
          <nav aria-label="บัญชีของฉัน" className="mx-auto mt-1 grid max-w-3xl grid-cols-3 gap-1 rounded-2xl bg-white p-1.5 shadow-card ring-1 ring-line/60 sm:flex sm:items-center">
            <Link href="/profile" className={item}>{icon("M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z")}แก้ไขข้อมูล</Link>
            <Link href="/my-sheets" className={item}>{icon("M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zm0 0v6h6M8 13h8M8 17h5")}ชีทของฉัน</Link>
            <SignOutButton
              icon={icon("M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l-5-5 5-5M5 12h11")}
              className={`${tile} text-red-600 hover:bg-red-50 disabled:opacity-60 sm:ml-auto`}
            />
          </nav>
        )}
      </div>

      </div>
      <div className="bg-white py-10 md:py-14">
        <div className="container-page">
          <h2 className="mb-5 text-xl font-semibold">ชีทสรุปที่แชร์</h2>
          {sheets.length === 0 ? (
            <div className="card px-6 py-14 text-center">
              <p className="font-semibold text-ink">ยังไม่มีชีทที่เผยแพร่</p>
              {isMe && <Link href="/sheets/upload" className="btn-primary btn-sm mt-5">แชร์ชีทแรก</Link>}
            </div>
          ) : (
            <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {sheets.map((s, i) => (
                <li key={s.id}><SheetCard sheet={s} priority={i < 3} /></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// Playful outline doodles drifting behind the boarding pass (decorative only)
const DOODLES = [
  { d: "m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z", x: "6%", y: "12%", s: 56, t: 9 },
  { d: "m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z", x: "16%", y: "4%", s: 34, t: 7 },
  { d: "M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4zM14 6l4 4", x: "26%", y: "70%", s: 50, t: 11 },
  { d: "M4 5h16v11H9l-5 4zM8 10.5h.01M12 10.5h.01M16 10.5h.01", x: "62%", y: "6%", s: 60, t: 10 },
  { d: "m2 9 10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5M22 9v6", x: "86%", y: "14%", s: 66, t: 12 },
  { d: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z", x: "92%", y: "52%", s: 52, t: 9 },
  { d: "M3 11v2a2 2 0 0 0 2 2h1l5 4V5L6 9H5a2 2 0 0 0-2 2zM15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12", x: "80%", y: "78%", s: 58, t: 13 },
  { d: "m5 3 13 6-6 2-2 6z", x: "52%", y: "84%", s: 44, t: 8 },
  { d: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1", x: "3%", y: "48%", s: 58, t: 12 },
  { d: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zm0 0v6h6M8 13h8M8 17h5", x: "8%", y: "82%", s: 54, t: 10 },
];

function Doodles() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 text-[#b9c3ec]">
      {DOODLES.map((o, i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`doodle absolute ${i % 3 === 2 ? "hidden md:block" : ""}`}
          style={{ left: o.x, top: o.y, width: o.s, height: o.s, animationDuration: `${o.t}s`, animationDelay: `-${i * 1.3}s` }}
        >
          <path d={o.d} />
        </svg>
      ))}
      {/* dashed path, like a doodled trail */}
      <svg viewBox="0 0 400 120" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="10 12" strokeLinecap="round" className="absolute bottom-[4%] left-[18%] hidden w-[42%] md:block">
        <path d="M5 100C80 20 160 120 240 60s110-40 150 10" />
      </svg>
    </div>
  );
}
