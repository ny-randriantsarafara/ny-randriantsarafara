import { ImageResponse } from 'next/og';

import { ogImageFiles, ogImageLocale } from '@/lib/i18n/og-image-locale.ts';
import { readPublication } from '@/lib/publication/read-publication.ts';
import { shareDescription } from '@/lib/seo/metadata.ts';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return ogImageFiles().map((file) => ({ file }));
}

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  const locale = ogImageLocale(file);
  const publication = readPublication();
  const profile = publication.content.profile;
  const headline = profile.headline[locale];

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
      <div style={{ fontSize: 26, marginTop: 24, lineHeight: 1.4, opacity: 0.75 }}>
        {shareDescription(publication, locale)}
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
