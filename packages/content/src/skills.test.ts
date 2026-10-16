import { describe, expect, it } from 'vitest';

import { skillAliases, skillName } from './skills.ts';
import { awsSkill } from './testing/fixture.ts';

import type { Skill } from './publication.ts';

const unitTests: Skill = {
  slug: 'unit-and-integration-tests',
  name: 'Unit and integration tests',
  frenchName: 'Tests unitaires et d’intégration',
  capabilitySlug: 'backend',
  usage: 'delivery',
  featured: false,
};

describe('skillName', () => {
  it('uses the French name on the French page', () => {
    expect(skillName(unitTests, 'fr')).toBe('Tests unitaires et d’intégration');
    expect(skillName(unitTests, 'en')).toBe('Unit and integration tests');
  });

  it('keeps the shared name when no French name is published', () => {
    expect(skillName(awsSkill, 'fr')).toBe('AWS');
  });
});

describe('skillAliases', () => {
  it('lists every published name of a skill', () => {
    expect(skillAliases(unitTests)).toEqual([
      'Unit and integration tests',
      'Tests unitaires et d’intégration',
    ]);
    expect(skillAliases(awsSkill)).toEqual(['AWS']);
  });
});
