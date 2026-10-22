import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { PRIVACY_INTRO, PrivacyContent } from "@/components/privacy-content";

export const metadata: Metadata = { title: "นโยบายความเป็นส่วนตัว (Privacy Policy)" };

export default function PrivacyPage() {
  return (
    <LegalPage title="นโยบายความเป็นส่วนตัว" intro={PRIVACY_INTRO}>
      <PrivacyContent />
    </LegalPage>
  );
}
