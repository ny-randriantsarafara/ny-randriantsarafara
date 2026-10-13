import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { buildProfilePageJsonLd, serializeJsonLd } from '../structured-data.ts';

describe('structured data', () => {
  it('builds a ProfilePage with a Person main entity', () => {
    const json = buildProfilePageJsonLd(
      activePublicationFixture,
      'en',
      new URL('https://nyhasinavalona.com')
    );
    expect(json['@type']).toBe('ProfilePage');
    const mainEntity = json.mainEntity;
    if (typeof mainEntity !== 'object' || mainEntity === null || Array.isArray(mainEntity)) {
      throw new Error('Expected mainEntity object');
    }
    expect(mainEntity['@type']).toBe('Person');
    expect(mainEntity.name).toBe(activePublicationFixture.content.profile.name);
  });

  it('escapes angle brackets in serialized JSON-LD', () => {
    const serialized = serializeJsonLd({ '@type': 'Thing', note: '<script>' });
    expect(serialized).toContain('\\u003c');
    expect(serialized).not.toContain('<script>');
  });
});
