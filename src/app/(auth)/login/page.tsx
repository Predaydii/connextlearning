import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { SCHOOL_DOMAIN } from "@/lib/constants";
import { isAllowedRedirect, withBase } from "@/lib/urls";
import { GoogleSignInButton } from "./google-button";

export const metadata: Metadata = { title: "เข้าสู่ระบบ", robots: { index: false } };

/** Only allow redirects back to this site. */
function safeCallback(v: string | string[] | undefined) {
  const s = Array.isArray(v) ? v[0] : v;
  return s && isAllowedRedirect(s) ? s : "/sheets";
}

const ERRORS: Record<string, string> = {
  access_denied: "คุณยกเลิกการเข้าสู่ระบบ",
  unable_to_create_user: `ใช้ได้เฉพาะบัญชี @${SCHOOL_DOMAIN} เท่านั้น`,
  forbidden: `ใช้ได้เฉพาะบัญชี @${SCHOOL_DOMAIN} เท่านั้น`,
};

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  const callbackUrl = safeCallback(sp.callbackUrl);
  if (await getCurrentUser()) redirect(callbackUrl);

  const errorCode = typeof sp.error === "string" ? sp.error.toLowerCase() : null;
  const error = errorCode ? (ERRORS[errorCode] ?? `เข้าสู่ระบบไม่สำเร็จ (ใช้ได้เฉพาะบัญชี @${SCHOOL_DOMAIN})`) : null;

  return (
    <section className="relative isolate flex flex-1 items-center justify-center overflow-hidden bg-[linear-gradient(150deg,#3a57e0_0%,#203cc7_45%,#13237a_100%)] px-4 py-14 sm:py-20">
      {/* blue backdrop: diagonal light bands, dot texture and a soft glow */}
      <span aria-hidden className="absolute -top-1/4 left-[8%] -z-10 h-[150%] w-40 rotate-[25deg] bg-white/5" />
      <span aria-hidden className="absolute -top-1/4 left-[40%] -z-10 h-[150%] w-24 rotate-[25deg] bg-white/5" />
      <span aria-hidden className="absolute -top-1/4 right-[12%] -z-10 h-[150%] w-32 rotate-[25deg] bg-white/5" />
      <span aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(rgb(255_255_255/0.12)_1.2px,transparent_1.6px)] [background-size:24px_24px]" />
      <span aria-hidden className="absolute -right-24 -bottom-24 -z-10 size-[420px] rounded-full bg-sky/40 blur-3xl" />
      <span aria-hidden className="absolute -top-32 -left-24 -z-10 size-[360px] rounded-full bg-[#3a57e0]/50 blur-3xl" />

      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-[0_30px_80px_rgb(8_16_60/0.35)] motion-safe:animate-rise sm:p-10">
        <img src={withBase("/img/logo-480.webp")} alt="Connext Learning" width={240} height={69} className="mx-auto mb-7 h-auto w-[210px]" />
        <h1 className="text-3xl font-bold">เข้าสู่ระบบ</h1>
        <p className="mt-2 text-sm">
          ใช้บัญชี Google ของโรงเรียน <strong className="font-semibold text-primary">@{SCHOOL_DOMAIN}</strong>
          <br />เพื่ออ่านและแชร์ชีทสรุป
        </p>

        {error && (
          <p role="alert" className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </p>
        )}

        <GoogleSignInButton callbackUrl={callbackUrl} />
      </div>
    </section>
  );
}
