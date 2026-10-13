import { ImageResponse } from 'next/og';

import { dictionaryFor } from '@/lib/i18n/dictionary.ts';
import { ogImageFiles, ogImageLocale } from '@/lib/i18n/og-image-locale.ts';
import { readPublication } from '@/lib/publication/read-publication.ts';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return ogImageFiles().map((file) => ({ file }));
}

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  const locale = ogImageLocale(file);
  const publication = readPublication();
  const dictionary = dictionaryFor(locale);
  const profile = publication.content.profile;
  const headline = profile.headline[locale];
  const location = profile.location[locale];

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        padding: 64,
        background: '#09090b',
        color: '#f4f4f5',
      }}
    >
      <div style={{ fontSize: 28, opacity: 0.8 }}>{dictionary.og.tagline}</div>
      <div
        style={{
          fontSize: 64,
          fontWeight: 600,
          background: 'linear-gradient(90deg, #6366f1, #a855f7, #f43f5e)',
          backgroundClip: 'text',
          color: 'transparent',
        }}
      >
        {profile.name}
      </div>
      <div style={{ fontSize: 36, marginTop: 16 }}>{headline}</div>
      <div style={{ fontSize: 24, marginTop: 8, opacity: 0.75 }}>{location}</div>
    </div>,
    { width: 1200, height: 630 }
  );
}
