import { PrivacyPage, buildPrivacyPageMetadata } from '@/components/page/privacy-page.tsx';

export function generateMetadata() {
  return buildPrivacyPageMetadata('fr');
}

export default function FrenchPrivacyPage() {
  return <PrivacyPage locale="fr" />;
}
