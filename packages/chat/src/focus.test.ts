import { initialContent } from '@portfolio/cms-provision/seed';
import { describe, expect, it } from 'vitest';

import { buildEntityCatalog } from './entities.ts';
import { entityCard, focusEntities, resolveFocus, scopeOf, type Focus } from './focus.ts';

const catalog = buildEntityCatalog(initialContent);

function focusKeys(focus: Focus): string[] {
  return focusEntities(focus).map((entity) => entity.key);
}

describe('resolveFocus', () => {
  it('uses the entities the question names', () => {
    const focus = resolveFocus(catalog, 'What did you do at Euronews?', 'en', []);
    expect(focus.kind).toBe('explicit');
    expect(focusKeys(focus)).toEqual(['experience:euronews']);
  });

  it('carries the previous entity into a follow-up', () => {
    const english = resolveFocus(catalog, 'And the tests?', 'en', ['What did you do at Euronews?']);
    expect(english.kind).toBe('inherited');
    expect(focusKeys(english)).toEqual(['experience:euronews']);

    const french = resolveFocus(catalog, 'Et les tests ?', 'fr', [
      'Quel a été ton rôle chez ITRAS ?',
    ]);
    expect(focusKeys(french)).toEqual(['experience:itras-group']);
  });

  it('keeps the entity through a chain of follow-ups', () => {
    const focus = resolveFocus(catalog, 'What about AWS?', 'en', [
      'What did you do at Euronews?',
      'And the tests?',
    ]);
    expect(focusKeys(focus)).toEqual(['experience:euronews']);
  });

  it('drops the entity once a self-contained question intervenes', () => {
    const focus = resolveFocus(catalog, 'And the tests?', 'en', [
      'What did you do at Euronews?',
      'How do you design backend APIs for partners?',
    ]);
    expect(focus.kind).toBe('none');
  });

  it('asks which entity a follow-up means when the previous question named several', () => {
    const focus = resolveFocus(catalog, 'And the tests?', 'en', ['Compare Euronews and ITRAS']);
    expect(focus.kind).toBe('ambiguous');
  });

  it('asks for the subject of a follow-up that opens the conversation', () => {
    expect(resolveFocus(catalog, 'Et les tests ?', 'fr', []).kind).toBe('ambiguous');
    expect(resolveFocus(catalog, 'What about that project?', 'en', []).kind).toBe('ambiguous');
  });

  it('reads a short question without history as a general one', () => {
    expect(resolveFocus(catalog, 'Kubernetes?', 'en', []).kind).toBe('none');
  });

  it('does not inherit into a self-contained question', () => {
    const focus = resolveFocus(catalog, 'How do you mentor junior engineers on a team?', 'en', [
      'What did you do at Euronews?',
    ]);
    expect(focus.kind).toBe('none');
  });
});

describe('scopeOf and entityCard', () => {
  it('covers the experiences and projects of every entity in focus', () => {
    const focus = resolveFocus(catalog, 'Compare Eurosport and Visa Insight', 'en', []);
    expect(scopeOf(focusEntities(focus))).toEqual({
      experienceSlugs: ['warner-bros-discovery'],
      projectSlugs: ['eurosport-api-platform', 'visa-insight'],
    });
  });

  it('has no scope without entities', () => {
    expect(scopeOf([])).toBeNull();
  });

  it('shows the experience card of an employer and the project card of a project', () => {
    const entities = focusEntities(resolveFocus(catalog, 'Eurosport or Visa Insight?', 'en', []));
    expect(entities.map(entityCard)).toEqual([
      { type: 'experience', slug: 'warner-bros-discovery' },
      { type: 'project', slug: 'visa-insight' },
    ]);
  });
});
