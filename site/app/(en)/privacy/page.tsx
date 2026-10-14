import { PrivacyPage, buildPrivacyPageMetadata } from '@/components/page/privacy-page.tsx';

export function generateMetadata() {
  return buildPrivacyPageMetadata('en');
}

export default function EnglishPrivacyPage() {
  return <PrivacyPage locale="en" />;
}
