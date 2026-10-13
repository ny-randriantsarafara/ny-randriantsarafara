import { randomUUID } from 'node:crypto';

export function uniqueSuffix(): string {
  return randomUUID().slice(0, 8);
}

export function capabilityValues(slug: string) {
  return {
    slug,
    icon: 'cloud',
    title_en: 'Test capability',
    title_fr: 'Capacité de test',
    description_en: 'Created by an integration test.',
    description_fr: 'Créée par un test d’intégration.',
  };
}
