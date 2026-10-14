import { createItems, readItems, updateSingleton } from '@directus/sdk';
import { toWorkingRecords } from '@portfolio/cms-schema';

import type { AdminClient, Log } from '../directus-client.ts';
import { initialContent } from './initial-content.ts';

export type SeedContentClient = Pick<AdminClient, 'request'>;

type AnswerIdRow = { id: string };

export type AnswerSeedDeps = {
  readExistingAnswerIds: () => Promise<readonly AnswerIdRow[]>;
  insertAnswers: (answers: ReturnType<typeof toWorkingRecords>['answers']) => Promise<void>;
};

// Seeding runs only while no experience exists; within a run, items whose slug already
// exists are skipped so an interrupted run can be resumed. When experiences already exist,
// answers are inserted only while the answers collection is still empty.
export async function seedInitialContent(client: SeedContentClient, log: Log): Promise<void> {
  const experiences = await client.request(readItems('experiences', { fields: ['id'], limit: 1 }));
  if (experiences.length > 0) {
    await seedAnswersWhenEmpty(client, log);
    log('Initial content skipped: experiences already exist.');
    return;
  }
  const records = toWorkingRecords(initialContent);

  await client.request(updateSingleton('profile', records.profile));
  await client.request(updateSingleton('chat_settings', records.chatSettings));
  await client.request(updateSingleton('site_settings', records.siteSettings));
  await client.request(
    createItems(
      'capabilities',
      missingBySlug(records.capabilities, await readSlugs(client, 'capabilities'))
    )
  );
  await client.request(
    createItems('skills', missingBySlug(records.skills, await readSlugs(client, 'skills')))
  );
  await client.request(
    createItems(
      'key_figures',
      missingBySlug(records.keyFigures, await readSlugs(client, 'key_figures'))
    )
  );
  await client.request(
    createItems('projects', missingBySlug(records.projects, await readSlugs(client, 'projects')))
  );
  await client.request(createItems('experiences', records.experiences));
  await client.request(
    createItems('answers', missingBySlug(records.answers, await readSlugs(client, 'answers')))
  );
  log(
    `Initial content loaded: ${records.experiences.length} experiences, ${records.projects.length} projects, ${records.skills.length} skills, ${records.answers.length} answers.`
  );
}

export async function seedAnswersFromDeps(
  deps: AnswerSeedDeps,
  answerCount: number,
  log: Log
): Promise<void> {
  const existingAnswers = await deps.readExistingAnswerIds();
  if (existingAnswers.length > 0) {
    log('Answers seed skipped: answers already exist.');
    return;
  }
  const records = toWorkingRecords(initialContent);
  await deps.insertAnswers(records.answers);
  log(`Answers seed loaded: ${answerCount} answers.`);
}

export async function seedAnswersWhenEmpty(client: SeedContentClient, log: Log): Promise<void> {
  const records = toWorkingRecords(initialContent);
  await seedAnswersFromDeps(
    {
      readExistingAnswerIds: () =>
        client.request(readItems('answers', { fields: ['id'], limit: 1 })),
      insertAnswers: (answers) =>
        client.request(createItems('answers', answers)).then(() => undefined),
    },
    records.answers.length,
    log
  );
}

type SluggedCollection = 'capabilities' | 'skills' | 'key_figures' | 'projects' | 'answers';

async function readSlugs(
  client: SeedContentClient,
  collection: SluggedCollection
): Promise<ReadonlySet<string>> {
  const items = await client.request(readItems(collection, { fields: ['slug'], limit: -1 }));
  return new Set(items.map((item) => item.slug));
}

function missingBySlug<Item extends { slug: string }>(
  items: readonly Item[],
  existingSlugs: ReadonlySet<string>
): Item[] {
  return items.filter((item) => !existingSlugs.has(item.slug));
}
