import { ForbiddenError } from '@directus/errors';
import type {
  Accountability,
  ApiExtensionContext,
  Item,
  OperationContext,
  Query,
  SchemaOverview,
} from '@directus/types';
import type {
  AnswerRecord,
  CapabilityRecord,
  ChatSettingsRecord,
  ExperienceRecord,
  KeyFigureRecord,
  ProfileRecord,
  ProjectRecord,
  PublicationRecord,
  SiteSettingsRecord,
  SkillRecord,
  WorkingRecords,
} from '@portfolio/cms-schema';
import type { Knex } from 'knex';

import type {
  PreparedPublication,
  PublicationStore,
  StoredPublication,
} from './publication-store.ts';

type DirectusAccess = {
  services: ApiExtensionContext['services'];
  database: Knex;
  accountability: Accountability;
  schema: SchemaOverview;
};

const ALL_ITEMS: Query = { fields: ['*'], limit: -1 };
const SINGLETON: Query = { fields: ['*'] };
const PUBLICATION_FIELDS: Query = { fields: ['id', 'status', 'content'] };

export async function openPublicationStore(context: OperationContext): Promise<PublicationStore> {
  if (context.accountability === null) {
    throw new ForbiddenError();
  }
  return createDirectusStore({
    services: context.services,
    database: context.database,
    accountability: context.accountability,
    schema: await context.getSchema(),
  });
}

function createDirectusStore(access: DirectusAccess): PublicationStore {
  return {
    readWorkingRecords: () => readWorkingRecords(access),
    readActivePublication: () => readActivePublication(access),
    readPublication: (id) => readPublication(access, id),
    savePrepared: (publication) => savePrepared(access, publication),
    activate: (id, activatedAt) => activate(access, id, activatedAt),
  };
}

function itemsOf<StoredItem extends Item>(
  access: DirectusAccess,
  collection: string,
  knex: Knex = access.database
) {
  return new access.services.ItemsService<StoredItem>(collection, {
    accountability: access.accountability,
    schema: access.schema,
    knex,
  });
}

async function readWorkingRecords(access: DirectusAccess): Promise<WorkingRecords> {
  const [
    profile,
    capabilities,
    skills,
    experiences,
    projects,
    keyFigures,
    answers,
    chatSettings,
    siteSettings,
  ] = await Promise.all([
    itemsOf<ProfileRecord>(access, 'profile').readSingleton(SINGLETON),
    itemsOf<CapabilityRecord>(access, 'capabilities').readByQuery(ALL_ITEMS),
    itemsOf<SkillRecord>(access, 'skills').readByQuery(ALL_ITEMS),
    itemsOf<ExperienceRecord>(access, 'experiences').readByQuery(ALL_ITEMS),
    itemsOf<ProjectRecord>(access, 'projects').readByQuery(ALL_ITEMS),
    itemsOf<KeyFigureRecord>(access, 'key_figures').readByQuery(ALL_ITEMS),
    itemsOf<AnswerRecord>(access, 'answers').readByQuery(ALL_ITEMS),
    itemsOf<ChatSettingsRecord>(access, 'chat_settings').readSingleton(SINGLETON),
    itemsOf<SiteSettingsRecord>(access, 'site_settings').readSingleton(SINGLETON),
  ]);
  return {
    profile,
    capabilities,
    skills,
    experiences,
    projects,
    keyFigures,
    answers,
    chatSettings,
    siteSettings,
  };
}

async function readActivePublication(access: DirectusAccess): Promise<StoredPublication | null> {
  const [active] = await itemsOf<PublicationRecord>(access, 'publications').readByQuery({
    ...PUBLICATION_FIELDS,
    filter: { status: { _eq: 'active' } },
    limit: 1,
  });
  if (active === undefined) {
    return null;
  }
  return toStoredPublication(active);
}

async function readPublication(access: DirectusAccess, id: string): Promise<StoredPublication> {
  const publication = await itemsOf<PublicationRecord>(access, 'publications').readOne(
    id,
    PUBLICATION_FIELDS
  );
  return toStoredPublication(publication);
}

async function savePrepared(
  access: DirectusAccess,
  publication: PreparedPublication
): Promise<string> {
  return access.database.transaction(async (transaction) => {
    const publications = itemsOf<PublicationRecord>(access, 'publications', transaction);
    await publications.updateByQuery(
      { filter: { status: { _eq: 'prepared' } }, limit: -1 },
      { status: 'discarded' }
    );
    const id = await publications.createOne({
      status: 'prepared',
      content: publication.content,
      changes: publication.changes,
      changes_overview: publication.changesOverview,
    });
    return String(id);
  });
}

async function activate(access: DirectusAccess, id: string, activatedAt: Date): Promise<void> {
  await access.database.transaction(async (transaction) => {
    const publications = itemsOf<PublicationRecord>(access, 'publications', transaction);
    await publications.updateByQuery(
      { filter: { status: { _eq: 'active' } }, limit: -1 },
      { status: 'superseded' }
    );
    await publications.updateOne(id, { status: 'active', activated_at: activatedAt.toISOString() });
  });
}

function toStoredPublication(record: PublicationRecord): StoredPublication {
  return { id: record.id, status: record.status, content: record.content };
}
