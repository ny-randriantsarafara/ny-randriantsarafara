import type { RestCommand } from '@directus/sdk';
import type { PortfolioSchema } from '@portfolio/cms-schema';
import { describe, expect, it } from 'vitest';

import { initialContent } from './initial-content.ts';
import {
  seedAnswersWhenEmpty,
  seedInitialContent,
  type SeedContentClient,
} from './seed-initial-content.ts';

function isCommandOutput<Output>(value: unknown): value is Output {
  return true;
}

function clientWithResponses(responses: unknown[]): {
  client: SeedContentClient;
  callCount: () => number;
} {
  const queue = [...responses];
  let calls = 0;
  const request = async <Output>(
    _command: RestCommand<Output, PortfolioSchema>
  ): Promise<Output> => {
    calls += 1;
    const next = queue.shift();
    if (next === undefined) {
      const empty: unknown = [];
      if (isCommandOutput<Output>(empty)) {
        return empty;
      }
      throw new Error('Seed mock could not produce an empty response');
    }
    if (isCommandOutput<Output>(next)) {
      return next;
    }
    throw new Error('Seed mock response had an unexpected shape');
  };
  return { client: { request }, callCount: () => calls };
}

describe('seedAnswersWhenEmpty', () => {
  it('creates answers when the collection is empty', async () => {
    const logs: string[] = [];
    const { client, callCount } = clientWithResponses([[], []]);

    await seedAnswersWhenEmpty(client, (message) => logs.push(message));

    expect(callCount()).toBe(2);
    expect(
      logs.some((message) => message.includes(`${initialContent.answers.length} answers`))
    ).toBe(true);
  });

  it('skips when answers already exist', async () => {
    const logs: string[] = [];
    const { client, callCount } = clientWithResponses([[{ id: 'existing' }]]);

    await seedAnswersWhenEmpty(client, (message) => logs.push(message));

    expect(callCount()).toBe(1);
    expect(logs.some((message) => message.includes('Answers seed skipped'))).toBe(true);
  });
});

describe('seedInitialContent', () => {
  it('delegates to answers seeding when experiences already exist', async () => {
    const logs: string[] = [];
    const { client } = clientWithResponses([[{ id: '1' }], [{ id: 'existing' }]]);

    await seedInitialContent(client, (message) => logs.push(message));

    expect(logs.some((message) => message.includes('experiences already exist'))).toBe(true);
    expect(logs.some((message) => message.includes('Answers seed skipped'))).toBe(true);
  });
});
