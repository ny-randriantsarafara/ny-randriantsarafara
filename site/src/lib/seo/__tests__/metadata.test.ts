import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { buildMetadata, shareDescription, shareTitle } from '../metadata.ts';

describe('buildMetadata', () => {
  it('sets canonical and language alternates for English', () => {
    const metadata = buildMetadata(activePublicationFixture, 'en');
    expect(metadata.alternates?.canonical).toBe('/');
    expect(metadata.alternates?.languages).toEqual({
      'en-US': '/',
      fr: '/fr',
      'x-default': '/',
    });
  });

  it('sets the French canonical path', () => {
    const metadata = buildMetadata(activePublicationFixture, 'fr');
    expect(metadata.alternates?.canonical).toBe('/fr');
  });

  it('shares the page title and description when no share texts are published', () => {
    const metadata = buildMetadata(activePublicationFixture, 'fr');
    expect(metadata.openGraph?.title).toBe('Portfolio');
    expect(metadata.openGraph?.description).toBe('Ingénieur backend.');
    expect(metadata.twitter?.title).toBe('Portfolio');
  });

  it('shares the published share texts in the page language', () => {
    const publication = {
      ...activePublicationFixture,
      content: {
        ...activePublicationFixture.content,
        siteSettings: {
          ...activePublicationFixture.content.siteSettings,
          shareTitle: {
            en: 'Ny Hasinavalona | Let’s talk backend',
            fr: 'Ny Hasinavalona | Parlons backend',
          },
          shareDescription: {
            en: 'Senior backend engineer.',
            fr: 'Ingénieur backend senior.',
          },
        },
      },
    };
    const metadata = buildMetadata(publication, 'fr');
    expect(metadata.openGraph?.title).toBe('Ny Hasinavalona | Parlons backend');
    expect(metadata.openGraph?.description).toBe('Ingénieur backend senior.');
    expect(metadata.twitter?.description).toBe('Ingénieur backend senior.');
    expect(shareTitle(publication, 'en')).toBe('Ny Hasinavalona | Let’s talk backend');
    expect(shareDescription(publication, 'en')).toBe('Senior backend engineer.');
  });
});
