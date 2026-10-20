import { AddAdminForm, RemoveAdminButton } from "@/components/admin/admin-forms";
import { Avatar } from "@/components/avatar";
import { db } from "@/lib/db";
import { adminEmails } from "@/lib/env";
import { formatThaiDate } from "@/lib/format";
import { requireSuperAdminPage } from "@/lib/session";
import { SCHOOL_DOMAIN } from "@/lib/constants";

export const metadata = { title: "ผู้ดูแล" };

export default async function AdminAdminsPage() {
  await requireSuperAdminPage("/admins");
  const supers = adminEmails();
  const admins = await db.user.findMany({
    where: { OR: [{ role: "ADMIN" }, { email: { in: supers } }] },
    select: { id: true, name: true, email: true, image: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h2 className="text-lg font-semibold">เพิ่มผู้ดูแลรอง</h2>
        <p className="mb-5 text-sm">
          ผู้ดูแลรองตรวจชีท จัดการภาพ ข่าวสาร และวิดีโอได้ แต่เพิ่มหรือถอดผู้ดูแลไม่ได้ · ใช้บัญชี @{SCHOOL_DOMAIN} ที่เคยเข้าสู่ระบบเว็บนี้แล้ว
        </p>
        <AddAdminForm />
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-lg font-semibold">ผู้ดูแลทั้งหมด ({admins.length})</h2>
        <ul className="divide-y divide-line">
          {admins.map((a) => {
            const isSuper = supers.includes(a.email.toLowerCase());
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar name={a.name} image={a.image} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{a.name}</p>
                  <p className="truncate text-sm">{a.email} · เข้าร่วม {formatThaiDate(a.createdAt)}</p>
                </div>
                {isSuper ? (
                  <span className="rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-white">ผู้ดูแลระบบหลัก</span>
                ) : (
                  <>
                    <span className="rounded-full bg-primary-50 px-3 py-0.5 text-xs font-semibold text-primary">ผู้ดูแลรอง</span>
                    <RemoveAdminButton id={a.id} name={a.name} />
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
