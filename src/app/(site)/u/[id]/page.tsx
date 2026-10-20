import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { SheetCard } from "@/components/sheet-card";
import { ShareButton } from "@/components/share-button";
import { SignOutButton } from "@/components/sign-out-button";
import { CONTACTS, readContacts } from "@/lib/contacts";
import { gradeLabel } from "@/lib/constants";
import { formatNumber, formatThaiDate } from "@/lib/format";
import { classLabel, getAuthorProfile } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { adminHref } from "@/lib/urls";

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
  const { user, sheets, totalViews, rating } = profile;
  const isMe = viewer?.id === user.id;
  const label = classLabel(user);
  const contacts = readContacts(user.contacts);
  const links = CONTACTS.filter((c) => contacts[c.key]);
  const pill = "btn-outline btn-sm";

  // Boarding-pass fields
  const gate = user.memberType === "STUDENT" && user.grade ? gradeLabel(user.grade) : user.memberType === "TEACHER" ? "ครู" : user.memberType === "ALUMNI" ? "OB" : "–";
  const seat = user.memberType === "STUDENT" && user.room ? `${user.room}` : "–";
  const fields = [
    { k: "ชีทที่แชร์", v: formatNumber(sheets.length) },
    { k: "ครั้งที่ถูกอ่าน", v: formatNumber(totalViews) },
    { k: "คะแนนเฉลี่ย", v: rating.count ? `${rating.average.toFixed(1)} ★` : "–" },
    { k: "สมาชิกตั้งแต่", v: formatThaiDate(user.createdAt) },
  ];

  return (
    <div className="bg-primary-50 pt-10 md:pt-14">
      <div className="container-page">
        {/* ---------- Boarding pass ---------- */}
        <section aria-label={`บัตรโปรไฟล์ของ ${user.name}`} className="mx-auto flex max-w-4xl flex-col overflow-hidden rounded-[28px] shadow-brand-lg motion-safe:animate-rise md:flex-row">
          {/* main part */}
          <div className="relative flex-1 bg-white p-6 sm:p-8">
            <div className="flex items-center justify-between gap-3 border-b border-dashed border-line pb-4">
              <p className="text-xs font-bold tracking-[0.25em] text-primary">BOARDING PASS</p>
              <p className="text-xs font-semibold tracking-wider text-body">CONNEXT LEARNING</p>
            </div>

            {/* route */}
            <div className="mt-5 flex items-center gap-4">
              <div>
                <p className="text-[clamp(2rem,6vw,2.8rem)] leading-none font-bold text-ink">TK</p>
                <p className="mt-1 text-xs">ตราษตระการคุณ</p>
              </div>
              <div className="relative flex-1">
                <div className="border-t-2 border-dashed border-primary/30" />
                <svg viewBox="0 0 24 24" className="absolute top-1/2 left-1/2 size-7 -translate-x-1/2 -translate-y-1/2 rotate-90 fill-primary" aria-hidden>
                  <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5z" />
                </svg>
              </div>
              <div className="text-right">
                <p className="text-[clamp(2rem,6vw,2.8rem)] leading-none font-bold text-ink">ALL</p>
                <p className="mt-1 text-xs">All Learners</p>
              </div>
            </div>

            {/* passenger */}
            <div className="mt-6 flex items-center gap-4">
              <span className="shrink-0 rounded-full p-1 ring-2 ring-primary/20">
                <Avatar name={user.name} image={user.image} size={72} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-widest text-body uppercase">Passenger · ผู้เดินทาง</p>
                <h1 className="text-[clamp(1.4rem,3.4vw,2rem)] leading-tight font-bold break-words text-ink">{user.name}</h1>
                {label && <span className="mt-1 inline-block rounded-full bg-primary-50 px-3 py-0.5 text-sm font-semibold text-primary">{label}</span>}
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
              {fields.map((f) => (
                <div key={f.k}>
                  <dt className="text-[11px] font-semibold tracking-wider text-body uppercase">{f.k}</dt>
                  <dd className="mt-0.5 text-lg font-bold text-ink">{f.v}</dd>
                </div>
              ))}
            </dl>

            {links.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2 border-t border-dashed border-line pt-5" aria-label="ช่องทางติดต่อ">
                {links.map((c) => (
                  <li key={c.key}>
                    <a
                      href={c.href(contacts[c.key]!)}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      aria-label={c.label}
                      title={c.label}
                      className="grid size-10 place-items-center rounded-xl bg-primary-50 text-primary transition hover:-translate-y-0.5 hover:bg-primary hover:text-white"
                    >
                      <svg viewBox="0 0 24 24" className="size-5 fill-current" aria-hidden><path d={c.icon} fillRule="evenodd" /></svg>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* perforation: dashed line with a notch at each end */}
          <div aria-hidden className="relative h-0 border-t-2 border-dashed border-primary-50 md:h-auto md:w-0 md:border-t-0 md:border-l-2">
            <span className="absolute -top-3 -left-3 size-6 rounded-full bg-primary-50" />
            <span className="absolute -top-3 -right-3 size-6 rounded-full bg-primary-50 md:top-auto md:right-auto md:-bottom-3 md:-left-3" />
          </div>

          {/* stub */}
          <div className="flex flex-col justify-between gap-6 bg-[linear-gradient(160deg,#3a57e0_0%,#203cc7_55%,#13237a_100%)] p-6 text-white sm:p-8 md:w-64">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-1">
              <div>
                <p className="text-[11px] font-semibold tracking-widest text-white/70 uppercase">Gate</p>
                <p className="text-3xl font-bold">{gate}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-widest text-white/70 uppercase">Seat · ห้อง</p>
                <p className="text-3xl font-bold">{seat}</p>
              </div>
            </div>
            {/* barcode (decorative) */}
            <div aria-hidden className="h-14 rounded bg-[repeating-linear-gradient(90deg,#fff_0_2px,transparent_2px_4px,#fff_4px_5px,transparent_5px_9px,#fff_9px_12px,transparent_12px_14px)] opacity-90" />
            <ShareButton
              path={`/u/${user.id}`}
              title={`${user.name} · Connext Learning`}
              text={`ดูชีทสรุปของ ${user.name} บน Connext Learning`}
              label="แชร์โปรไฟล์"
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-white px-5 font-semibold text-primary transition hover:-translate-y-0.5 hover:bg-accent hover:text-ink"
            />
          </div>
        </section>

        {/* Your own profile: account actions */}
        {isMe && (
          <nav aria-label="บัญชีของฉัน" className="mx-auto mt-5 flex max-w-4xl flex-wrap items-center gap-2">
            <Link href="/profile" className={pill}>แก้ไขข้อมูล</Link>
            <Link href="/my-sheets" className={pill}>ชีทของฉัน</Link>
            {viewer.isAdmin && <Link href={adminHref("/")} className={pill}>แดชบอร์ดผู้ดูแล</Link>}
            <SignOutButton className="ml-auto cursor-pointer rounded-full px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60" />
          </nav>
        )}
      </div>

      <div className="mt-12 bg-white py-10 md:py-14">
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
