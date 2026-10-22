import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AnnouncementPopup } from "@/components/announcement-popup";
import { getAnnouncements } from "@/lib/queries";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const announcements = await getAnnouncements().catch(() => null);
  return (
    <>
      <SiteHeader />
      <main id="main" className="site-main flex-1">
        {children}
      </main>
      <SiteFooter />
      <AnnouncementPopup everyone={announcements?.everyone ?? []} />
    </>
  );
}
