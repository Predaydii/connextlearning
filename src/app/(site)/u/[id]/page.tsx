import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { SheetCard } from "@/components/sheet-card";
import { formatNumber, formatThaiDate } from "@/lib/format";
import { getAuthorProfile } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata(props: PageProps<"/u/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const profile = await getAuthorProfile(id);
  // Student names: shown on the site, kept out of search engines
  return { title: profile ? `ชีทของ ${profile.user.name}` : "ไม่พบผู้ใช้", robots: { index: false } };
}

export default async function AuthorProfilePage(props: PageProps<"/u/[id]">) {
  const { id } = await props.params;
  const [viewer, profile] = await Promise.all([getCurrentUser(), getAuthorProfile(id)]);
  if (!profile) notFound();
  const { user, sheets, totalViews, rating } = profile;
  const isMe = viewer?.id === user.id;

  return (
    <div className="container-page py-10 md:py-14">
      <section className="card flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:text-left md:p-8">
        <Avatar name={user.name} image={user.image} size={96} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-sky">ผู้จัดทำชีทสรุป</p>
          <h1 className="text-[clamp(1.5rem,3vw,2.1rem)] font-bold break-words">{user.name}</h1>
          <p className="mt-1 text-sm">เป็นสมาชิกตั้งแต่ {formatThaiDate(user.createdAt)}</p>
        </div>
        {isMe && <Link href="/my-sheets" className="btn-outline btn-sm">จัดการชีทของฉัน</Link>}
      </section>

      <dl className="card mt-4 grid grid-cols-3 divide-x divide-line py-4 text-center">
        <div className="flex flex-col-reverse">
          <dt className="text-xs sm:text-sm">ชีทที่เผยแพร่</dt>
          <dd className="text-xl font-bold text-primary sm:text-2xl">{formatNumber(sheets.length)}</dd>
        </div>
        <div className="flex flex-col-reverse">
          <dt className="text-xs sm:text-sm">ครั้งที่ถูกอ่าน</dt>
          <dd className="text-xl font-bold text-primary sm:text-2xl">{formatNumber(totalViews)}</dd>
        </div>
        <div className="flex flex-col-reverse">
          <dt className="text-xs sm:text-sm">คะแนนเฉลี่ย{rating.count ? ` (${rating.count})` : ""}</dt>
          <dd className="text-xl font-bold text-primary sm:text-2xl">
            {rating.count ? <>{rating.average.toFixed(1)} <span className="text-accent">★</span></> : "–"}
          </dd>
        </div>
      </dl>

      <h2 className="mt-10 mb-5 text-xl font-semibold">ชีทสรุปทั้งหมด</h2>
      {sheets.length === 0 ? (
        <div className="card px-6 py-14 text-center">
          <p className="font-semibold text-ink">ยังไม่มีชีทที่เผยแพร่</p>
          {isMe && <Link href="/sheets/upload" className="btn-primary btn-sm mt-5">อัปโหลดชีทแรก</Link>}
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {sheets.map((s, i) => (
            <li key={s.id}><SheetCard sheet={s} priority={i < 3} /></li>
          ))}
        </ul>
      )}
    </div>
  );
}
