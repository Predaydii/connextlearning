import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "อัปโหลดชีทสรุป", robots: { index: false } };

// The submit action downloads, merges and re-uploads files, so give it time.
export const maxDuration = 120;

export default async function UploadPage() {
  const user = await requireUser("/sheets/upload");
  return (
    <div className="bg-primary-50/60 py-10 md:py-14">
      <div className="container-page max-w-4xl">
        <h1 className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold">แชร์ชีทสรุป</h1>
        <UploadForm userName={user.name} />
      </div>
    </div>
  );
}
