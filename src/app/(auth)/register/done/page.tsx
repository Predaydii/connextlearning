import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, loginUrl } from "@/lib/session";
import { isAllowedRedirect, withBase } from "@/lib/urls";

export const metadata: Metadata = { title: "ลงทะเบียนเสร็จสมบูรณ์", robots: { index: false } };

function safeNext(v: string | string[] | undefined) {
  const s = Array.isArray(v) ? v[0] : v;
  return s && isAllowedRedirect(s) && !s.startsWith("/register") ? s : "/sheets";
}

/** Shown once after the first registration (register() sends people here). */
export default async function RegisterDonePage(props: PageProps<"/register/done">) {
  const next = safeNext((await props.searchParams).next);
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(next));
  if (!user.registered) redirect(`/register?next=${encodeURIComponent(next)}`);

  return (
    <section className="flex flex-1 items-center justify-center bg-primary-50/60 px-4 py-10 sm:py-14">
      <div className="card grid w-full max-w-md justify-items-center gap-3 p-8 text-center motion-safe:animate-rise sm:p-10">
        <span className="grid size-20 place-items-center rounded-full bg-primary text-white shadow-brand motion-safe:animate-pop-in">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" className="size-10" aria-hidden>
            <path d="m5 12 5 5 9-10" />
          </svg>
        </span>
        <h1 className="mt-2 text-2xl font-bold">ลงทะเบียนเสร็จสมบูรณ์</h1>
        <p>ยินดีต้อนรับ {user.name} สู่ Connext Learning พร้อมอ่านและแชร์ชีทแล้ว</p>
        {/* full page load so the header picks up the new profile */}
        <a href={withBase(next)} className="btn-primary mt-3">เริ่มใช้งาน</a>
      </div>
    </section>
  );
}
