import { validatePublicationContent } from '@portfolio/content';
import { describe, expect, it } from 'vitest';

import { initialContent } from './initial-content.ts';

describe('initial content', () => {
  it('is a valid publication in both languages', () => {
    expect(validatePublicationContent(initialContent)).toEqual({
      valid: true,
      content: initialContent,
    });
  });

  it('keeps every experience of the current site', () => {
    expect(initialContent.experiences.map((experience) => experience.slug)).toEqual([
      'warner-bros-discovery',
      'euronews',
      'numer-hei',
      'novity',
      'bocasay',
      'itras-group',
      'allo-application',
    ]);
  });

  it('keeps the current case studies and side projects', () => {
    expect(initialContent.projects.map((project) => `${project.kind}:${project.slug}`)).toEqual([
      'professional:eurosport-api-platform',
      'professional:high-traffic-media-platform',
      'professional:saas-for-craftsmen',
      'personal:visa-insight',
      'personal:lalana-lemurion',
      'personal:cloud-platform-maestro',
    ]);
  });

  it('features the core stack of the current site', () => {
    expect(
      initialContent.skills.filter((skill) => skill.featured).map((skill) => skill.name)
    ).toEqual(['AWS', 'Terraform', 'TypeScript', 'Node.js', 'GraphQL', 'PostgreSQL']);
  });
});
