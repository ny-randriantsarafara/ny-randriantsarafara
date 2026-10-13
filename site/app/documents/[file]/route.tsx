import { buildCvModel } from '@/cv/cv-model.ts';
import { renderCv } from '@/cv/render-cv.tsx';
import { dictionaryFor } from '@/lib/i18n/dictionary.ts';
import { cvFileName, locales } from '@/lib/i18n/locales.ts';
import { cvLocale } from '@/lib/i18n/og-image-locale.ts';
import { readPublication } from '@/lib/publication/read-publication.ts';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return locales.map((locale) => ({ file: cvFileName(locale) }));
}

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  const locale = cvLocale(file);
  const publication = readPublication();
  const model = buildCvModel(publication.content, locale, dictionaryFor(locale));
  const bytes = await renderCv(model);
  const body = Uint8Array.from(bytes);
  return new Response(body, {
    headers: {
      'Content-Type': 'application/pdf',
    },
  });
}
