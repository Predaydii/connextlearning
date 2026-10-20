import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { SheetCard } from "@/components/sheet-card";
import { ShareButton } from "@/components/share-button";
import { SignOutButton } from "@/components/sign-out-button";
import { QrCode } from "@/components/qr-code";
import { CONTACTS, readContacts } from "@/lib/contacts";
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
  const item = "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-primary-50 hover:text-primary";
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
    <div className="bg-primary-50 pt-10 md:pt-14">
      <div className="container-page">
        {/* ---------- Boarding pass: every fact once ---------- */}
        <section aria-label={`บัตรโปรไฟล์ของ ${user.name}`} className="mx-auto flex max-w-3xl flex-col overflow-hidden rounded-[28px] bg-white shadow-brand-lg motion-safe:animate-rise md:flex-row">
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
                <h1 className="text-[clamp(1.4rem,3.4vw,1.9rem)] leading-tight font-bold break-words text-ink">{user.name}</h1>
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
                สมาชิกตั้งแต่ {formatThaiDate(user.createdAt)}
                {rating.count > 0 && <> · คะแนนเฉลี่ย <span className="font-semibold text-ink">{rating.average.toFixed(1)}</span> <span className="text-accent">★</span> ({rating.count})</>}
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
          <div className="flex items-center gap-5 p-6 sm:p-8 md:w-56 md:flex-col md:justify-center md:text-center">
            <QrCode value={profileUrl} label={`QR code ลิงก์โปรไฟล์ของ ${user.name}`} className="size-28 shrink-0 rounded-xl ring-1 ring-line md:size-36" />
            <div className="grid gap-3">
              <p className="text-xs text-body">สแกนเพื่อเปิดโปรไฟล์นี้</p>
              <ShareButton
                path={`/u/${user.id}`}
                title={`${user.name} · Connext Learning`}
                text={`ดูชีทสรุปของ ${user.name} บน Connext Learning`}
                label="แชร์โปรไฟล์"
                className="btn-primary btn-sm cursor-pointer gap-2"
              />
            </div>
          </div>
        </section>

        {/* Your own profile: account actions */}
        {isMe && (
          <nav aria-label="บัญชีของฉัน" className="mx-auto mt-5 flex max-w-3xl flex-wrap items-center gap-1 rounded-2xl bg-white p-1.5 shadow-card ring-1 ring-line/60">
            <Link href="/profile" className={item}>{icon("M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z")}แก้ไขข้อมูล</Link>
            <Link href="/my-sheets" className={item}>{icon("M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zm0 0v6h6M8 13h8M8 17h5")}ชีทของฉัน</Link>
            {viewer.isAdmin && <Link href={adminHref("/")} className={item}>{icon("M4 13h6V4H4zm0 7h6v-5H4zm10 0h6v-9h-6zm0-16v5h6V4z")}แดชบอร์ดผู้ดูแล</Link>}
            <SignOutButton className="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-60" />
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
