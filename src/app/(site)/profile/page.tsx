import type { Metadata } from "next";
import { BackButton } from "@/components/back-button";
import { ProfileForm, type ProfileValues } from "@/components/profile-form";
import { db } from "@/lib/db";
import { profileSelect, toProfileValues } from "@/lib/members";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "แก้ไขโปรไฟล์", robots: { index: false } };

export default async function ProfilePage(props: PageProps<"/profile">) {
  const user = await requireUser("/profile");
  const saved = (await props.searchParams).saved === "1";
  const u = await db.user.findUniqueOrThrow({ where: { id: user.id }, select: profileSelect });
  const initial: ProfileValues = toProfileValues(u);

  return (
    <div className="bg-primary-50/60 py-10 md:py-14">
      <div className="container-page max-w-xl">
        <BackButton />
        <div className="card p-6 sm:p-8">
          <h1 className="mb-6 text-2xl font-bold">แก้ไขโปรไฟล์</h1>
          {saved && (
            <p role="status" className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
              บันทึกข้อมูลแล้ว
            </p>
          )}
          <ProfileForm next="/profile?saved=1" email={user.email} initial={initial} submitLabel="บันทึกข้อมูล" />
        </div>
      </div>
    </div>
  );
}
