import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AnnouncementPopup } from "@/components/announcement-popup";
import { getAnnouncement } from "@/lib/queries";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const announcement = await getAnnouncement().catch(() => null);
  return (
    <>
      <SiteHeader />
      <main id="main" className="site-main flex-1">
        {children}
      </main>
      <SiteFooter />
      {announcement && <AnnouncementPopup key={announcement.id} announcement={announcement} />}
    </>
  );
}
