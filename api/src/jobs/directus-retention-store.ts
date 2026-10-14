import { z } from 'zod';

const idListSchema = z.object({
  data: z.array(z.object({ id: z.string() })).optional(),
});

export type RetentionStore = {
  deleteExpiredEvents(cutoffIso: string): Promise<number>;
  deleteExpiredChatExchanges(cutoffIso: string): Promise<number>;
  deletePreviousVisitorSalts(beforeDay: string): Promise<number>;
};

const BATCH_SIZE = 100;

export function createDirectusRetentionStore(
  directusUrl: string,
  apiToken: string,
  fetchImpl: typeof fetch = fetch
): RetentionStore {
  const baseUrl = directusUrl.endsWith('/') ? directusUrl.slice(0, -1) : directusUrl;
  return {
    deleteExpiredEvents: (cutoffIso) =>
      deleteExpiredCollection(baseUrl, apiToken, 'events', cutoffIso, fetchImpl),
    deleteExpiredChatExchanges: (cutoffIso) =>
      deleteExpiredCollection(baseUrl, apiToken, 'chat_exchanges', cutoffIso, fetchImpl),
    deletePreviousVisitorSalts: (beforeDay) =>
      deleteSaltsBeforeDay(baseUrl, apiToken, beforeDay, fetchImpl),
  };
}

async function deleteExpiredCollection(
  baseUrl: string,
  apiToken: string,
  collection: string,
  cutoffIso: string,
  fetchImpl: typeof fetch
): Promise<number> {
  return deleteInBatches(baseUrl, apiToken, collection, cutoffIso, fetchImpl, 0);
}

async function deleteInBatches(
  baseUrl: string,
  apiToken: string,
  collection: string,
  cutoffIso: string,
  fetchImpl: typeof fetch,
  deletedSoFar: number
): Promise<number> {
  const ids = await readExpiredIds(baseUrl, apiToken, collection, cutoffIso, fetchImpl);
  if (ids.length === 0) {
    return deletedSoFar;
  }
  await deleteIds(baseUrl, apiToken, collection, ids, fetchImpl);
  return deleteInBatches(
    baseUrl,
    apiToken,
    collection,
    cutoffIso,
    fetchImpl,
    deletedSoFar + ids.length
  );
}

async function readExpiredIds(
  baseUrl: string,
  apiToken: string,
  collection: string,
  cutoffIso: string,
  fetchImpl: typeof fetch
): Promise<string[]> {
  const query = new URLSearchParams({
    fields: 'id',
    limit: String(BATCH_SIZE),
    'filter[date_created][_lt]': cutoffIso,
  });
  const response = await fetchImpl(`${baseUrl}/items/${collection}?${query.toString()}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
    throw new Error(`Directus ${collection} retention read failed with status ${response.status}.`);
  }
  const payload = idListSchema.parse(await response.json());
  return (payload.data ?? []).map((row) => row.id);
}

async function deleteIds(
  baseUrl: string,
  apiToken: string,
  collection: string,
  ids: string[],
  fetchImpl: typeof fetch
): Promise<void> {
  const response = await fetchImpl(`${baseUrl}/items/${collection}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(ids),
  });
  if (!response.ok) {
    throw new Error(
      `Directus ${collection} retention delete failed with status ${response.status}.`
    );
  }
}

async function deleteSaltsBeforeDay(
  baseUrl: string,
  apiToken: string,
  beforeDay: string,
  fetchImpl: typeof fetch
): Promise<number> {
  return deleteSaltsInBatches(baseUrl, apiToken, beforeDay, fetchImpl, 0);
}

async function deleteSaltsInBatches(
  baseUrl: string,
  apiToken: string,
  beforeDay: string,
  fetchImpl: typeof fetch,
  deletedSoFar: number
): Promise<number> {
  const query = new URLSearchParams({
    fields: 'id',
    limit: String(BATCH_SIZE),
    'filter[day][_lt]': beforeDay,
  });
  const response = await fetchImpl(`${baseUrl}/items/visitor_salts?${query.toString()}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  if (!response.ok) {
    throw new Error(`Directus visitor_salts retention read failed with status ${response.status}.`);
  }
  const payload = idListSchema.parse(await response.json());
  const ids = (payload.data ?? []).map((row) => row.id);
  if (ids.length === 0) {
    return deletedSoFar;
  }
  await deleteIds(baseUrl, apiToken, 'visitor_salts', ids, fetchImpl);
  return deleteSaltsInBatches(baseUrl, apiToken, beforeDay, fetchImpl, deletedSoFar + ids.length);
}
