import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { activePublicationFixture } from '@portfolio/content/testing';
import { describe, expect, it } from 'vitest';

import { parseActivePublication, readPublicationFile } from '../read-publication.ts';

describe('parseActivePublication', () => {
  it('accepts a valid active publication', () => {
    expect(parseActivePublication(activePublicationFixture)).toEqual(activePublicationFixture);
  });

  it('rejects invalid content references', () => {
    const broken = {
      ...activePublicationFixture,
      content: { ...activePublicationFixture.content, skills: [] },
    };
    expect(() => parseActivePublication(broken)).toThrow(/Invalid publication content/);
  });
});

describe('readPublicationFile', () => {
  it('reads a publication from disk', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'publication-'));
    const filePath = path.join(directory, 'publication.json');
    await writeFile(filePath, JSON.stringify(activePublicationFixture));
    expect(readPublicationFile(filePath)).toEqual(activePublicationFixture);
  });

  it('throws when the file is missing', () => {
    expect(() => readPublicationFile('/tmp/missing-publication.json')).toThrow(
      /No publication at.*content:seed/
    );
  });
});
