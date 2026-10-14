import { describe, expect, it, vi } from 'vitest';

import type { AdminClient } from '../directus-client.ts';
import { initialContent } from './initial-content.ts';
import { seedAnswersWhenEmpty, seedInitialContent } from './seed-initial-content.ts';

function clientWithResponses(responses: unknown[]): AdminClient {
  const request = vi.fn(async () => {
    const next = responses.shift();
    if (next === undefined) {
      return [];
    }
    return next;
  });
  return { request } as AdminClient;
}

describe('seedAnswersWhenEmpty', () => {
  it('creates answers when the collection is empty', async () => {
    const logs: string[] = [];
    const client = clientWithResponses([[], []]);

    await seedAnswersWhenEmpty(client, (message) => logs.push(message));

    expect(client.request).toHaveBeenCalledTimes(2);
    expect(
      logs.some((message) => message.includes(`${initialContent.answers.length} answers`))
    ).toBe(true);
  });

  it('skips when answers already exist', async () => {
    const logs: string[] = [];
    const client = clientWithResponses([[{ id: 'existing' }]]);

    await seedAnswersWhenEmpty(client, (message) => logs.push(message));

    expect(client.request).toHaveBeenCalledTimes(1);
    expect(logs.some((message) => message.includes('Answers seed skipped'))).toBe(true);
  });
});

describe('seedInitialContent', () => {
  it('delegates to answers seeding when experiences already exist', async () => {
    const logs: string[] = [];
    const client = clientWithResponses([[{ id: '1' }], [{ id: 'existing' }]]);

    await seedInitialContent(client, (message) => logs.push(message));

    expect(logs.some((message) => message.includes('experiences already exist'))).toBe(true);
    expect(logs.some((message) => message.includes('Answers seed skipped'))).toBe(true);
  });
});
