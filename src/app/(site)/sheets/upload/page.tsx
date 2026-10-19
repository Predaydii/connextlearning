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
        <p className="text-sm font-medium text-sky">แชร์ชีทสรุป</p>
        <h1 className="text-[clamp(1.6rem,3vw,2.2rem)] font-bold">อัปโหลดชีทสรุป</h1>
        <p className="mt-2 max-w-2xl">
          อัปโหลดไฟล์ PDF หรือรูปภาพ (PNG / JPG) ได้หลายไฟล์ ระบบจะรวมเป็น PDF ไฟล์เดียวตามลำดับที่คุณจัดไว้
          และจะเผยแพร่หลังผู้ดูแลตรวจสอบแล้ว
        </p>
        <UploadForm userName={user.name} />
      </div>
    </div>
  );
}
