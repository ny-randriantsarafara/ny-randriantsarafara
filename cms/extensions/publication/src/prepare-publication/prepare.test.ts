import type { WorkingRecords } from '@portfolio/cms-schema';
import { storedRecordsOf } from '@portfolio/cms-schema/testing';
import { contentFixture, warnerExperience } from '@portfolio/content/testing';
import { describe, expect, it, vi } from 'vitest';

import { NothingToPublishError, PublicationInvalidError } from '../errors.ts';
import type { PublicationStore, StoredPublication } from '../publication-store.ts';
import { fakeStore } from '../testing/fake-store.ts';
import { planPreparation, preparePublication } from './prepare.ts';

const records = storedRecordsOf(contentFixture);

function activePublication(content: unknown): StoredPublication {
  return { id: 'active-publication', status: 'active', content };
}

describe('planPreparation', () => {
  it('prepares the first publication from the working records', () => {
    const prepared = planPreparation(records, null);

    expect(prepared.content).toEqual(contentFixture);
    expect(prepared.changes.firstPublication).toBe(true);
    expect(prepared.changesOverview).toContain('First publication.');
  });

  it('refuses a missing French text and names the item and field', () => {
    const edited: WorkingRecords = {
      ...records,
      experiences: records.experiences.map((experience) => ({ ...experience, summary_fr: null })),
    };

    expect(() => planPreparation(edited, null)).toThrow(PublicationInvalidError);
    expect(() => planPreparation(edited, null)).toThrow(
      `experiences[${warnerExperience.slug}].summary.fr`
    );
  });

  it('refuses when nothing changed since the active publication', () => {
    expect(() => planPreparation(records, activePublication(contentFixture))).toThrow(
      NothingToPublishError
    );
  });

  it('summarizes the changes since the active publication', () => {
    const edited: WorkingRecords = {
      ...records,
      siteSettings: { ...records.siteSettings, description_en: 'A new description.' },
    };

    const prepared = planPreparation(edited, activePublication(contentFixture));

    expect(prepared.changes.singletons.siteSettings).toEqual(['description']);
    expect(prepared.changesOverview).toContain('Changes since the active publication:');
  });

  it('treats an active publication it cannot read as no publication', () => {
    const prepared = planPreparation(records, activePublication({ profile: 'outdated' }));

    expect(prepared.changes.firstPublication).toBe(true);
  });
});

describe('preparePublication', () => {
  it('stores the prepared publication and returns its overview', async () => {
    const savePrepared = vi.fn<PublicationStore['savePrepared']>(
      async () => 'prepared-publication'
    );
    const expected = planPreparation(records, null);

    const result = await preparePublication(fakeStore({ savePrepared }));

    expect(result).toEqual({
      publication: 'prepared-publication',
      status: 'prepared',
      overview: expected.changesOverview,
    });
    expect(savePrepared).toHaveBeenCalledWith(expected);
  });
});
