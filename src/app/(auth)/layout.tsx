import { SiteHeader } from "@/components/site-header";

/** Sign-in pages: site nav but no footer. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
    </>
  );
}
