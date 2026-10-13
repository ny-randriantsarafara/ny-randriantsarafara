import type { PublicationContent } from './publication.ts';

export type CollectionName =
  | 'capabilities'
  | 'skills'
  | 'experiences'
  | 'projects'
  | 'keyFigures'
  | 'answers';
export type SingletonName = 'profile' | 'chatSettings' | 'siteSettings';
export type ItemChange = { slug: string; fields: string[] };
export type CollectionChanges = {
  added: string[];
  removed: string[];
  changed: ItemChange[];
  reordered: boolean;
};
export type ChangeSummary = {
  firstPublication: boolean;
  collections: Record<CollectionName, CollectionChanges>;
  singletons: Record<SingletonName, string[]>;
};

const collectionNames: readonly CollectionName[] = [
  'capabilities',
  'skills',
  'experiences',
  'projects',
  'keyFigures',
  'answers',
];
const singletonNames: readonly SingletonName[] = ['profile', 'chatSettings', 'siteSettings'];

const collectionLabels: Record<CollectionName, string> = {
  capabilities: 'Capabilities',
  skills: 'Skills',
  experiences: 'Experiences',
  projects: 'Projects',
  keyFigures: 'Key figures',
  answers: 'Answers',
};
const singletonLabels: Record<SingletonName, string> = {
  profile: 'Profile',
  chatSettings: 'Chat settings',
  siteSettings: 'Site settings',
};

export function summarizeChanges(
  previous: PublicationContent | null,
  next: PublicationContent
): ChangeSummary {
  return {
    firstPublication: previous === null,
    collections: {
      capabilities: diffCollection(previous?.capabilities ?? [], next.capabilities),
      skills: diffCollection(previous?.skills ?? [], next.skills),
      experiences: diffCollection(previous?.experiences ?? [], next.experiences),
      projects: diffCollection(previous?.projects ?? [], next.projects),
      keyFigures: diffCollection(previous?.keyFigures ?? [], next.keyFigures),
      answers: diffCollection(previous?.answers ?? [], next.answers),
    },
    singletons: {
      profile: changedSingletonFields(previous?.profile ?? null, next.profile),
      chatSettings: changedSingletonFields(previous?.chatSettings ?? null, next.chatSettings),
      siteSettings: changedSingletonFields(previous?.siteSettings ?? null, next.siteSettings),
    },
  };
}

export function hasChanges(summary: ChangeSummary): boolean {
  if (summary.firstPublication) {
    return true;
  }
  const collectionChanged = Object.values(summary.collections).some(
    (changes) =>
      changes.added.length > 0 ||
      changes.removed.length > 0 ||
      changes.changed.length > 0 ||
      changes.reordered
  );
  const singletonChanged = Object.values(summary.singletons).some((fields) => fields.length > 0);
  return collectionChanged || singletonChanged;
}

export function formatChangeOverview(summary: ChangeSummary): string {
  if (summary.firstPublication) {
    return [
      'First publication.',
      '',
      ...collectionNames.map(
        (name) => `- ${collectionLabels[name]}: ${summary.collections[name].added.length}`
      ),
    ].join('\n');
  }
  const lines = [
    ...collectionNames.flatMap((name) =>
      collectionLines(collectionLabels[name], summary.collections[name])
    ),
    ...singletonNames.flatMap((name) =>
      singletonLines(singletonLabels[name], summary.singletons[name])
    ),
  ];
  if (lines.length === 0) {
    return 'No changes since the active publication.';
  }
  return ['Changes since the active publication:', '', ...lines].join('\n');
}

function diffCollection<Item extends { slug: string }>(
  previous: readonly Item[],
  next: readonly Item[]
): CollectionChanges {
  const previousBySlug = new Map(previous.map((item) => [item.slug, item]));
  const nextSlugs = new Set(next.map((item) => item.slug));
  const commonInPreviousOrder = previous
    .map((item) => item.slug)
    .filter((slug) => nextSlugs.has(slug));
  const commonInNextOrder = next
    .map((item) => item.slug)
    .filter((slug) => previousBySlug.has(slug));
  return {
    added: next.filter((item) => !previousBySlug.has(item.slug)).map((item) => item.slug),
    removed: previous.filter((item) => !nextSlugs.has(item.slug)).map((item) => item.slug),
    changed: next.flatMap((item) => itemChange(previousBySlug.get(item.slug), item)),
    reordered: commonInPreviousOrder.join(',') !== commonInNextOrder.join(','),
  };
}

function itemChange<Item extends { slug: string }>(
  previous: Item | undefined,
  next: Item
): ItemChange[] {
  if (previous === undefined) {
    return [];
  }
  const fields = changedFields(previous, next);
  if (fields.length === 0) {
    return [];
  }
  return [{ slug: next.slug, fields }];
}

function changedSingletonFields(previous: object | null, next: object): string[] {
  if (previous === null) {
    return [];
  }
  return changedFields(previous, next);
}

function changedFields(previous: object, next: object): string[] {
  const previousValues = new Map(Object.entries(previous));
  const nextValues = new Map(Object.entries(next));
  const fieldNames = new Set([...previousValues.keys(), ...nextValues.keys()]);
  return [...fieldNames]
    .filter(
      (name) => JSON.stringify(previousValues.get(name)) !== JSON.stringify(nextValues.get(name))
    )
    .toSorted();
}

function collectionLines(label: string, changes: CollectionChanges): string[] {
  return [
    ...changes.added.map((slug) => `- ${label}: added \`${slug}\``),
    ...changes.removed.map((slug) => `- ${label}: removed \`${slug}\``),
    ...changes.changed.map(
      (change) => `- ${label}: changed \`${change.slug}\` (${change.fields.join(', ')})`
    ),
    ...reorderLine(label, changes.reordered),
  ];
}

function reorderLine(label: string, reordered: boolean): string[] {
  if (!reordered) {
    return [];
  }
  return [`- ${label}: order changed`];
}

function singletonLines(label: string, fields: readonly string[]): string[] {
  if (fields.length === 0) {
    return [];
  }
  return [`- ${label}: changed (${fields.join(', ')})`];
}
