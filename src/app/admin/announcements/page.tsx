import { AnnouncementForm, AnnouncementRowActions } from "@/components/admin/announcement-forms";
import { db } from "@/lib/db";
import { formatNumber, formatThaiDateTime } from "@/lib/format";
import { requireAdminPage } from "@/lib/session";

export const metadata = { title: "ประกาศแจ้งเตือน" };

function status(a: { active: boolean; startsAt: Date; endsAt: Date | null }, now: Date) {
  if (!a.active) return { label: "หยุดแสดงแล้ว", live: false };
  if (a.endsAt && a.endsAt <= now) return { label: "หมดเวลาแล้ว", live: false };
  if (a.startsAt > now) return { label: "ตั้งเวลาไว้", live: false };
  return { label: "กำลังแสดง", live: true };
}

export default async function AdminAnnouncementsPage() {
  await requireAdminPage("/announcements");
  const items = await db.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  const now = new Date();

  return (
    <div className="grid gap-6">
      <section className="card p-6">
        <h2 className="text-lg font-semibold">ส่งประกาศใหม่</h2>
        <p className="mb-5 text-sm">ขึ้นเป็นป๊อปอัปเมื่อเปิดเว็บ แต่ละคนเห็นประกาศละครั้ง · ส่งถึงทุกคนหรือเลือกผู้ใช้ และตั้งเวลาเริ่ม/สิ้นสุดได้</p>
        <AnnouncementForm />
      </section>

      <section className="card p-6">
        <h2 className="mb-5 text-lg font-semibold">ประกาศที่ส่งแล้ว</h2>
        {items.length === 0 ? (
          <p className="text-sm">ยังไม่มีประกาศ</p>
        ) : (
          <ul className="grid gap-3">
            {items.map((a) => {
              const s = status(a, now);
              return (
                <li key={a.id} className={`rounded-2xl p-4 ring-1 ${s.live ? "bg-primary-50/60 ring-primary/40" : "ring-line"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-xs">
                        <span className={`rounded-full px-2 py-0.5 font-semibold ${s.live ? "bg-primary text-white" : "bg-line/60 text-ink"}`}>{s.label}</span>
                        <span className="rounded-full bg-white px-2 py-0.5 font-medium text-ink ring-1 ring-line">
                          {a.userIds.length ? `ผู้ใช้ ${formatNumber(a.userIds.length)} คน` : "ทุกคน"}
                        </span>
                        {formatThaiDateTime(a.startsAt)} – {a.endsAt ? formatThaiDateTime(a.endsAt) : "จนกว่าจะหยุด"}
                      </p>
                      <p className="mt-1.5 font-semibold text-ink">{a.title}</p>
                      {a.body && <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm">{a.body}</p>}
                    </div>
                    <AnnouncementRowActions id={a.id} active={a.active} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
