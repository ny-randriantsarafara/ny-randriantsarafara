import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { buildMetadata } from '../metadata.ts';

describe('buildMetadata', () => {
  it('sets canonical and language alternates for English', () => {
    const metadata = buildMetadata(activePublicationFixture, 'en');
    expect(metadata.alternates?.canonical).toBe('/');
    expect(metadata.alternates?.languages).toEqual({
      en: '/',
      fr: '/fr',
      'x-default': '/',
    });
  });

  it('sets the French canonical path', () => {
    const metadata = buildMetadata(activePublicationFixture, 'fr');
    expect(metadata.alternates?.canonical).toBe('/fr');
  });
});
