import { describe, expect, it } from 'vitest';

import { privacyDocument } from '../privacy-content.ts';
import { chatModelProcessor, privacyProcessors } from '../processors.ts';

const controller = { name: 'Test Owner', email: 'owner@example.com' };

describe('privacyDocument retention copy', () => {
  it('matches plan 5b retention rules in English', () => {
    const document = privacyDocument('en', controller);
    const collected = document.sections.find(
      (section) => section.heading === 'What is collected and why'
    );
    expect(collected?.paragraphs.join(' ')).toMatch(/page memory|journey/i);
    expect(collected?.paragraphs.join(' ')).toMatch(/redacted/i);
    const retention = document.sections.find((section) => section.heading === 'Retention');
    expect(retention).toBeDefined();
    const text = retention?.paragraphs.join(' ') ?? '';
    expect(text).toContain('thirteen calendar months');
    expect(text).toContain('deleted three years after they were last updated');
    expect(text).not.toContain('same person');
    expect(text).toContain('Search Console');
    expect(text).toContain('without limit');
  });

  it('matches plan 5b retention rules in French', () => {
    const document = privacyDocument('fr', controller);
    const collected = document.sections.find(
      (section) => section.heading === 'Données collectées et finalités'
    );
    expect(collected?.paragraphs.join(' ')).toMatch(/mémoire de page|parcours/i);
    expect(collected?.paragraphs.join(' ')).toMatch(/redig/i);
    const retention = document.sections.find(
      (section) => section.heading === 'Durées de conservation'
    );
    expect(retention).toBeDefined();
    const text = retention?.paragraphs.join(' ') ?? '';
    expect(text).toContain('treize mois calendaires');
    expect(text).toContain('trois ans après leur dernière mise à jour');
    expect(text).not.toContain('même personne');
  });
});

describe('privacyDocument processors', () => {
  it('lists infrastructure processors without a model provider while model mode is off', () => {
    expect(chatModelProcessor).toBeNull();
    const document = privacyDocument('en', controller);
    const processors = document.sections.find((section) => section.heading === 'Processors');
    expect(processors?.paragraphs.length).toBe(privacyProcessors.length);
    expect(processors?.paragraphs.join(' ')).not.toMatch(/model provider|chat model/i);
  });
});
