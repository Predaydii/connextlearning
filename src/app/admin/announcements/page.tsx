import { AnnouncementForm, AnnouncementRowActions } from "@/components/admin/announcement-forms";
import { db } from "@/lib/db";
import { formatThaiDateTime } from "@/lib/format";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "ประกาศแจ้งเตือน" };

export default async function AdminAnnouncementsPage() {
  await requireAdminPage("/announcements");
  const items = await db.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  // Only the newest active one pops up
  const live = items.find((a) => a.active);

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h2 className="text-lg font-semibold">ส่งประกาศใหม่</h2>
        <p className="mb-5 text-sm">ขึ้นเป็นป๊อปอัปเมื่อผู้ใช้เปิดเว็บ แต่ละคนเห็นครั้งเดียว · ส่งใหม่จะแทนประกาศเดิมทันที</p>
        <AnnouncementForm />
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-lg font-semibold">ประกาศที่ส่งแล้ว</h2>
        {items.length === 0 ? (
          <p className="text-sm">ยังไม่มีประกาศ</p>
        ) : (
          <ul className="grid gap-3">
            {items.map((a) => (
              <li key={a.id} className={`rounded-2xl p-4 ring-1 ${a.id === live?.id ? "bg-primary-50/60 ring-primary/40" : "ring-line"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-xs">
                      {a.id === live?.id ? (
                        <span className="rounded-full bg-primary px-2 py-0.5 font-semibold text-white">กำลังแสดง</span>
                      ) : (
                        <span className="rounded-full bg-line/60 px-2 py-0.5 font-medium text-ink">{a.active ? "ถูกแทนด้วยประกาศใหม่" : "หยุดแสดงแล้ว"}</span>
                      )}
                      {formatThaiDateTime(a.createdAt)}
                    </p>
                    <p className="mt-1.5 font-semibold text-ink">{a.title}</p>
                    {a.body && <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm">{a.body}</p>}
                  </div>
                  <AnnouncementRowActions id={a.id} active={a.active} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
