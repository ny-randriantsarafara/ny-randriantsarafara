import type { Block, Locale, PublicationContent } from '@portfolio/content';

export type EvidenceReference = { sourceId: string; quote: string };
export type EvidenceSource = {
  id: string;
  collection:
    | 'profile'
    | 'capabilities'
    | 'skills'
    | 'experiences'
    | 'projects'
    | 'keyFigures'
    | 'answers';
  entitySlug: string | null;
  field: string;
  text: string;
  block: Block | null;
};

export function buildEvidenceSources(
  content: PublicationContent,
  locale: Locale
): EvidenceSource[] {
  const sources: EvidenceSource[] = [];
  function visit(
    value: unknown,
    collection: EvidenceSource['collection'],
    slug: string | null,
    field: string,
    path: string,
    block: Block | null
  ): void {
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value);
      if (text.trim().length > 0)
        sources.push({ id: path, collection, entitySlug: slug, field, text, block });
    } else if (Array.isArray(value)) {
      value.forEach((item, index) =>
        visit(item, collection, slug, field, `${path}/${index}`, block)
      );
    } else if (typeof value === 'object' && value !== null) {
      if ('en' in value && 'fr' in value) {
        visit(value[locale], collection, slug, field, `${path}/${locale}`, block);
      } else {
        for (const [key, item] of Object.entries(value)) {
          if (collection === 'answers' && ['sampleQuestions', 'blocks', 'starter'].includes(key))
            continue;
          visit(
            item,
            collection,
            slug,
            field.length === 0 ? key : `${field}.${key}`,
            `${path}/${key}`,
            block
          );
        }
      }
    }
  }
  visit(content.profile, 'profile', null, '', 'profile', null);
  for (const item of content.capabilities)
    visit(item, 'capabilities', item.slug, '', `capabilities/${item.slug}`, {
      type: 'skills',
      capabilitySlug: item.slug,
    });
  for (const item of content.skills)
    visit(item, 'skills', item.slug, '', `skills/${item.slug}`, {
      type: 'skills',
      highlightSlugs: [item.slug],
    });
  for (const item of content.experiences)
    visit(item, 'experiences', item.slug, '', `experiences/${item.slug}`, {
      type: 'experience',
      slug: item.slug,
    });
  for (const item of content.projects)
    visit(item, 'projects', item.slug, '', `projects/${item.slug}`, {
      type: 'project',
      slug: item.slug,
    });
  for (const item of content.keyFigures)
    visit(item, 'keyFigures', item.slug, '', `keyFigures/${item.slug}`, {
      type: 'key-figures',
      slugs: [item.slug],
    });
  for (const item of content.answers)
    visit(item, 'answers', item.slug, '', `answers/${item.slug}`, {
      type: 'strengths',
      answerSlug: item.slug,
    });
  return sources;
}

export function resolveEvidence(
  refs: EvidenceReference[],
  sources: ReadonlyMap<string, EvidenceSource>
): { status: 'ok'; sources: EvidenceSource[] } | { status: 'invalid_evidence' } {
  const resolved = new Map<string, EvidenceSource>();
  for (const ref of refs) {
    const source = sources.get(ref.sourceId);
    if (
      source === undefined ||
      ref.quote.trim().length === 0 ||
      !source.text.normalize('NFC').includes(ref.quote.normalize('NFC'))
    )
      return { status: 'invalid_evidence' };
    resolved.set(source.id, source);
  }
  return { status: 'ok', sources: [...resolved.values()] };
}
