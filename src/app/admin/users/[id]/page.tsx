import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { ProfileForm } from "@/components/profile-form";
import { db } from "@/lib/db";
import { requireAdminPage } from "@/lib/session";
import { formatThaiDate } from "@/lib/format";
import { adminHref } from "@/lib/urls";
import { profileSelect, toProfileValues } from "@/lib/members";

export const metadata = { title: "แก้ไขข้อมูลผู้ใช้" };

/** Admins correct a user's registration with the same form (and rules) users fill in themselves. */
export default async function AdminUserEditPage(props: PageProps<"/admin/users/[id]">) {
  const { id } = await props.params;
  await requireAdminPage(`/users/${id}`);
  const saved = (await props.searchParams).saved === "1";

  const u = await db.user.findUnique({
    where: { id },
    select: { ...profileSelect, id: true, name: true, email: true, image: true, registeredAt: true, createdAt: true, updatedAt: true },
  });
  if (!u) notFound();

  // Not registered yet: start from the Google name, like the registration page does
  const initial = toProfileValues(u);
  if (!u.registeredAt && !initial.firstName) {
    const [first = "", ...rest] = u.name.trim().split(/\s+/);
    initial.firstName = first;
    initial.lastName = rest.join(" ");
  }

  return (
    <div className="mx-auto grid max-w-2xl gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={adminHref("/users")} className="text-sm font-medium text-primary hover:underline">← กลับไปรายชื่อผู้ใช้</Link>
        <Link href={`/u/${u.id}`} target="_blank" className="text-sm font-medium text-primary hover:underline">ดูโปรไฟล์สาธารณะ ↗</Link>
      </div>

      <section className="card p-6 sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <Avatar name={u.name} image={u.image} size={48} />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold">{u.name}</h2>
            <p className="text-xs">
              สมัคร {formatThaiDate(u.createdAt)} · {u.registeredAt ? `ลงทะเบียน ${formatThaiDate(u.registeredAt)}` : "ยังไม่ลงทะเบียน"}
            </p>
          </div>
        </div>

        {saved && (
          <p role="status" className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
            บันทึกข้อมูลแล้ว
          </p>
        )}

        {/* key: after a save the form starts again from what is now stored */}
        <ProfileForm key={`${u.id}-${u.updatedAt.getTime()}`} userId={u.id} next={adminHref(`/users/${u.id}`)} email={u.email} initial={initial} submitLabel="บันทึกข้อมูลผู้ใช้" />
      </section>
    </div>
  );
}
