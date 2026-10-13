import { RootDocument } from '@/components/page/root-document.tsx';
import { readPublication } from '@/lib/publication/read-publication.ts';
import { buildMetadata, buildViewport } from '@/lib/seo/metadata.ts';

import type { ReactNode } from 'react';

import '../globals.css';

export function generateMetadata() {
  const publication = readPublication();
  return buildMetadata(publication, 'fr');
}

export const viewport = buildViewport();

export default function FrenchLayout({ children }: { children: ReactNode }) {
  return <RootDocument locale="fr">{children}</RootDocument>;
}
