import type { Metadata, Viewport } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import { withBase } from "@/lib/urls";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-prompt",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000"),
  title: {
    default: "Connext Learning – พื้นที่เรียนออนไลน์สำหรับทุกคน",
    template: "%s | Connext Learning",
  },
  description:
    "Connext Learning – Online Learning Space พื้นที่แลกเปลี่ยนเรียนรู้และเชื่อมโยงระบบนิเวศการศึกษาของโรงเรียนตราษตระการคุณ ห้องเรียนออนไลน์ ม.1–ม.6 และชีทสรุปทุกวิชา",
  icons: {
    icon: [
      { url: withBase("/favicon.ico"), sizes: "any" },
      { url: withBase("/favicon-32.png"), type: "image/png", sizes: "32x32" },
    ],
    apple: withBase("/apple-touch-icon.png"),
  },
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "Connext Learning",
    images: [withBase("/img/hero-960.webp")],
  },
};

export const viewport: Viewport = {
  themeColor: "#254ce9",
  // Light design only, whatever the device is set to
  colorScheme: "only light",
};

// Opening screen once per browser session (skipped with reduced motion). Runs before the first paint;
// the class is removed again once the hero has finished animating in.
const INTRO_SCRIPT = `try{var d=document.documentElement;if(!sessionStorage.getItem("cl-intro")&&!matchMedia("(prefers-reduced-motion: reduce)").matches){sessionStorage.setItem("cl-intro","1");d.classList.add("intro");setTimeout(function(){d.classList.remove("intro")},5200)}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // html.intro is added by INTRO_SCRIPT before hydration
    <html lang="th" className={prompt.variable} suppressHydrationWarning>
      <body className="flex min-h-dvh flex-col">
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
        <div className="intro-screen" aria-hidden>
          <div className="grid justify-items-center gap-4 text-center">
            <img src={withBase("/img/logo-white-480.webp")} alt="" width={240} height={69} fetchPriority="high" className="w-[min(280px,64vw)]" />
            <p className="text-lg font-medium text-white/85">Learn &amp; Share · อ่านชีท แชร์ชีท</p>
            <div className="h-1 w-40 overflow-hidden rounded-full bg-white/20">
              <span className="block h-full w-full rounded-full bg-[#7cc8ff]" />
            </div>
          </div>
        </div>
        <a
          href="#main"
          className="absolute -top-16 left-3 z-[100] rounded-xl bg-primary px-4 py-2.5 text-white transition-[top] focus:top-3"
        >
          ข้ามไปยังเนื้อหา
        </a>
        {children}
      </body>
    </html>
  );
}
