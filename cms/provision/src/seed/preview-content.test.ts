import { validatePublicationContent } from '@portfolio/content';
import { describe, expect, it } from 'vitest';

import { initialContent } from './initial-content.ts';
import { contentForEnvironment } from './preview-content.ts';

describe('preview content', () => {
  it('keeps the production and local seed unchanged', () => {
    expect(contentForEnvironment({})).toBe(initialContent);
    expect(contentForEnvironment({ PREVIEW_CONTENT: 'false' })).toBe(initialContent);
  });

  it('uses valid synthetic content without personal facts, addresses or accounts', () => {
    const content = contentForEnvironment({ PREVIEW_CONTENT: 'true' });
    expect(validatePublicationContent(content)).toEqual({ valid: true, content });
    expect(content.profile.name).toBe('Preview Engineer');
    expect(content.profile.email).toBe('preview@example.invalid');
    expect(content.experiences.map((item) => item.company)).toEqual(['Example Company']);
    expect(content.answers.length).toBeGreaterThan(0);
    expect(JSON.stringify(content)).not.toMatch(
      /nyhasinavalona|randriantsarafara|eurosport|warner/i
    );
  });
});
