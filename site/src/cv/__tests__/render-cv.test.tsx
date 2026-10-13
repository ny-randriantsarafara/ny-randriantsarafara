// @vitest-environment node
import { contentFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { dictionaryFor } from '../../lib/i18n/dictionary.ts';
import { locales } from '../../lib/i18n/locales.ts';
import { buildCvModel } from '../cv-model.ts';
import { renderCv } from '../render-cv.tsx';

describe('renderCv', () => {
  it.each(locales)('renders a PDF for the %s locale', async (locale) => {
    const model = buildCvModel(contentFixture, locale, dictionaryFor(locale));
    const bytes = await renderCv(model);
    const header = String.fromCharCode(...bytes.slice(0, 5));
    expect(header).toBe('%PDF-');
    expect(bytes.length).toBeGreaterThan(2048);
  });
});
