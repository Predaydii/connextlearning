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
    images: [withBase("/img/sheets/banner.webp")],
  },
};

export const viewport: Viewport = {
  themeColor: "#203cc7",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={prompt.variable}>
      <body className="flex min-h-dvh flex-col">
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
