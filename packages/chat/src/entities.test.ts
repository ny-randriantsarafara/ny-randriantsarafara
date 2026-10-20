import { initialContent } from '@portfolio/cms-provision/seed';
import type { PublicationContent } from '@portfolio/content';
import { describe, expect, it } from 'vitest';

import {
  buildEntityCatalog,
  buildPublishedVocabulary,
  entitiesInText,
  namesUnpublishedOrganization,
} from './entities.ts';

describe('buildEntityCatalog', () => {
  const catalog = buildEntityCatalog(initialContent);

  it('groups an employer with the projects run at that employer', () => {
    const warner = catalog.find((entity) => entity.key === 'experience:warner-bros-discovery');
    expect(warner?.experienceSlugs).toEqual(['warner-bros-discovery']);
    expect(warner?.projectSlugs).toEqual(['eurosport-api-platform']);
  });

  it('keeps projects without an employer as their own entity', () => {
    const visa = catalog.find((entity) => entity.key === 'project:visa-insight');
    expect(visa?.experienceSlugs).toEqual([]);
    expect(visa?.projectSlugs).toEqual(['visa-insight']);
  });

  it('turns distinctive name parts into aliases but not generic ones', () => {
    const maestro = catalog.find((entity) => entity.key === 'project:cloud-platform-maestro');
    const aliases = maestro?.aliases.map((alias) => alias.trim());
    expect(aliases).toContain('maestro');
    expect(aliases).not.toContain('cloud platform');
  });
});

describe('entitiesInText', () => {
  const catalog = buildEntityCatalog(initialContent);
  const keysIn = (text: string) => entitiesInText(catalog, text).map((entity) => entity.key);

  it('recognises employers by name, parenthesised brand or project title', () => {
    expect(keysIn('What did you do at Euronews?')).toEqual(['experience:euronews']);
    expect(keysIn('Tell me about Eurosport')).toEqual(['experience:warner-bros-discovery']);
    expect(keysIn('Quel était ton rôle chez ITRAS ?')).toEqual(['experience:itras-group']);
  });

  it('lists entities in the order the question names them', () => {
    expect(keysIn('Compare Visa Insight and Lalana')).toEqual([
      'project:visa-insight',
      'project:lalana-lemurion',
    ]);
    expect(keysIn('Lalana or Visa Insight?')).toEqual([
      'project:lalana-lemurion',
      'project:visa-insight',
    ]);
  });

  it('treats both names of a combined project as one entity', () => {
    expect(keysIn('Difference between Lalana and Lemurion?')).toEqual(['project:lalana-lemurion']);
  });

  it('gives no focus to ordinary technical wording', () => {
    expect(keysIn('Do you build cloud platforms for high traffic media?')).toEqual([]);
    expect(keysIn('Which APIs and data systems did you design?')).toEqual([]);
  });

  it('gives no focus to the generic words of a project title', () => {
    const content: PublicationContent = {
      ...initialContent,
      projects: initialContent.projects.map((project) =>
        project.slug === 'visa-insight'
          ? { ...project, title: { en: 'Visa Insight and tests', fr: 'Visa Insight et tests' } }
          : project
      ),
    };
    const withTests = buildEntityCatalog(content);

    expect(entitiesInText(withTests, 'Which tests did you write?')).toEqual([]);
    expect(
      entitiesInText(withTests, 'Tell me about Visa Insight').map((entity) => entity.key)
    ).toEqual(['project:visa-insight']);
  });
});

describe('entities of a mission for a client', () => {
  // Employers written as "Agency, mission Client / Brand", projects naming the client only.
  const content: PublicationContent = {
    ...initialContent,
    experiences: initialContent.experiences.map((experience) => {
      if (experience.slug === 'euronews') {
        return { ...experience, company: 'Anywr, mission Euronews' };
      }
      if (experience.slug === 'warner-bros-discovery') {
        return { ...experience, company: 'Objectware, mission Warner Bros. Discovery / Eurosport' };
      }
      return experience;
    }),
    projects: initialContent.projects.map((project) => {
      if (project.slug === 'high-traffic-media-platform') {
        return {
          ...project,
          title: { en: 'Euronews: APIs and tests', fr: 'Euronews : API et tests' },
        };
      }
      if (project.slug === 'eurosport-api-platform') {
        return { ...project, company: 'Eurosport' };
      }
      return project;
    }),
  };
  const catalog = buildEntityCatalog(content);
  const keysIn = (text: string) => entitiesInText(catalog, text).map((entity) => entity.key);

  it('groups a project with the mission whose client it names', () => {
    const euronews = catalog.find((entity) => entity.key === 'experience:euronews');
    const warner = catalog.find((entity) => entity.key === 'experience:warner-bros-discovery');

    expect(euronews?.projectSlugs).toEqual(['high-traffic-media-platform']);
    expect(warner?.projectSlugs).toEqual(['eurosport-api-platform']);
    expect(catalog.map((entity) => entity.key)).not.toContain(
      'project:high-traffic-media-platform'
    );
  });

  it('recognises the client, its brand and the agency on their own', () => {
    expect(keysIn('Qu’avez-vous fait chez Euronews ?')).toEqual(['experience:euronews']);
    expect(keysIn('What did you do at Anywr?')).toEqual(['experience:euronews']);
    expect(keysIn('What did you build at Warner Bros. Discovery?')).toEqual([
      'experience:warner-bros-discovery',
    ]);
    expect(keysIn('Tell me about Eurosport')).toEqual(['experience:warner-bros-discovery']);
  });

  it('gives no focus to the tests of a sentence', () => {
    expect(keysIn('La couverture des tests est passée de 0 % à 82 %.')).toEqual([]);
  });
});

describe('namesUnpublishedOrganization', () => {
  const vocabulary = buildPublishedVocabulary(initialContent, buildEntityCatalog(initialContent));
  const namesUnpublished = (text: string) => namesUnpublishedOrganization(text, vocabulary);

  it('flags an employer the publication does not mention', () => {
    expect(namesUnpublished('What did you do at Google?')).toBe(true);
    expect(namesUnpublished('Qu’as-tu fait chez Capgemini ?')).toBe(true);
  });

  it('flags a lowercase employer the publication never mentions', () => {
    expect(namesUnpublished('did you work at google')).toBe(true);
    expect(namesUnpublished('what test coverage did you reach at airbus')).toBe(true);
    expect(namesUnpublished('qu avez-vous fait chez capgemini')).toBe(true);
    expect(namesUnpublished('What coverage did you achieve at company-7-a?')).toBe(true);
  });

  it('accepts published employers, projects and terms in any case', () => {
    expect(namesUnpublished('What did you do at Euronews?')).toBe(false);
    expect(namesUnpublished('what did you do at euronews for three years')).toBe(false);
    expect(namesUnpublished('What did you do at warner bros?')).toBe(false);
    expect(namesUnpublished('Qu’avez-vous fait chez Numer HEI ?')).toBe(false);
    expect(namesUnpublished('What did you build at AWS?')).toBe(false);
    expect(namesUnpublished('Do you live in Paris?')).toBe(false);
  });

  it('accepts the French name of a published skill', () => {
    const content = {
      ...initialContent,
      skills: initialContent.skills.map((skill) => {
        if (skill.slug !== 'mentoring') {
          return skill;
        }
        return { ...skill, frenchName: 'Accompagnement Technique' };
      }),
    };
    const withFrenchName = buildPublishedVocabulary(content, buildEntityCatalog(content));
    const question = 'Qu’avez-vous fait chez Accompagnement Technique ?';

    expect(namesUnpublished(question)).toBe(true);
    expect(namesUnpublishedOrganization(question, withFrenchName)).toBe(false);
  });

  it('ignores ordinary phrases after "at" and "chez"', () => {
    expect(namesUnpublished('What did you work at during school?')).toBe(false);
    expect(namesUnpublished('Do you have at least 5 years of TypeScript?')).toBe(false);
    expect(namesUnpublished('How do you encrypt data at rest?')).toBe(false);
    expect(namesUnpublished('How do you handle traffic at scale?')).toBe(false);
    expect(namesUnpublished('What latency at 10k requests per second?')).toBe(false);
    expect(namesUnpublished('Avez-vous travaillé chez un client grand compte ?')).toBe(false);
  });
});
