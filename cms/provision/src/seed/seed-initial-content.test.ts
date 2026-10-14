import { describe, expect, it } from 'vitest';

import { initialContent } from './initial-content.ts';
import { seedAnswersFromDeps, type AnswerSeedDeps } from './seed-initial-content.ts';

function createAnswerSeedDeps(
  existingIds: readonly { id: string }[],
  onInsert: () => void
): AnswerSeedDeps {
  return {
    readExistingAnswerIds: async () => existingIds,
    insertAnswers: async () => {
      onInsert();
    },
  };
}

describe('seedAnswersFromDeps', () => {
  it('creates answers when the collection is empty', async () => {
    const logs: string[] = [];
    const insertEvents: string[] = [];
    const deps = createAnswerSeedDeps([], () => {
      insertEvents.push('inserted');
    });

    await seedAnswersFromDeps(deps, initialContent.answers.length, (message) => logs.push(message));

    expect(insertEvents).toEqual(['inserted']);
    expect(
      logs.some((message) => message.includes(`${initialContent.answers.length} answers`))
    ).toBe(true);
  });

  it('skips when answers already exist', async () => {
    const logs: string[] = [];
    const insertEvents: string[] = [];
    const deps = createAnswerSeedDeps([{ id: 'existing' }], () => {
      insertEvents.push('inserted');
    });

    await seedAnswersFromDeps(deps, initialContent.answers.length, (message) => logs.push(message));

    expect(insertEvents).toEqual([]);
    expect(logs.some((message) => message.includes('Answers seed skipped'))).toBe(true);
  });
});
