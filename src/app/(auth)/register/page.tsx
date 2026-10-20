import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile-form";
import { getCurrentUser, loginUrl } from "@/lib/session";
import { isAllowedRedirect, withBase } from "@/lib/urls";

export const metadata: Metadata = { title: "ลงทะเบียน", robots: { index: false } };

function safeNext(v: string | string[] | undefined) {
  const s = Array.isArray(v) ? v[0] : v;
  return s && isAllowedRedirect(s) && !s.startsWith("/register") ? s : "/sheets";
}

/** First sign-in: every user lands here after Google; registered users go straight on. */
export default async function RegisterPage(props: PageProps<"/register">) {
  const next = safeNext((await props.searchParams).next);
  const user = await getCurrentUser();
  if (!user) redirect(loginUrl(next));
  if (user.registered) redirect(next);

  // Google name as a starting point ("ปัณณวัฒน์ ใจดี")
  const [first = "", ...rest] = user.name.trim().split(/\s+/);

  return (
    <section className="flex flex-1 justify-center bg-primary-50/60 px-4 py-10 sm:py-14">
      <div className="w-full max-w-xl">
        <div className="card p-6 motion-safe:animate-rise sm:p-8">
          <div className="mb-6 text-center">
            <img src={withBase("/img/logo-480.webp")} alt="Connext Learning" width={240} height={69} className="mx-auto mb-5 h-auto w-[180px]" />
            <h1 className="text-2xl font-bold">ลงทะเบียนครั้งแรก</h1>
          </div>
          <ProfileForm next={next} email={user.email} initial={{ firstName: first, lastName: rest.join(" ") }} submitLabel="ลงทะเบียนและเริ่มใช้งาน" />
        </div>
      </div>
    </section>
  );
}
