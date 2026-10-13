import { buildPublicationContent } from '@portfolio/cms-schema';
import type { WorkingRecords } from '@portfolio/cms-schema';
import {
  formatChangeOverview,
  hasChanges,
  publicationContentSchema,
  summarizeChanges,
} from '@portfolio/content';
import type { PublicationContent } from '@portfolio/content';

import { invalidContentError, NothingToPublishError } from '../errors.ts';
import type {
  PreparedPublication,
  PublicationStore,
  StoredPublication,
} from '../publication-store.ts';

export type PreparationResult = { publication: string; status: 'prepared'; overview: string };

export function planPreparation(
  records: WorkingRecords,
  active: StoredPublication | null
): PreparedPublication {
  const validation = buildPublicationContent(records);
  if (!validation.valid) {
    throw invalidContentError(validation.problems);
  }
  const changes = summarizeChanges(readContent(active), validation.content);
  if (!hasChanges(changes)) {
    throw new NothingToPublishError();
  }
  return { content: validation.content, changes, changesOverview: formatChangeOverview(changes) };
}

export async function preparePublication(store: PublicationStore): Promise<PreparationResult> {
  const prepared = planPreparation(
    await store.readWorkingRecords(),
    await store.readActivePublication()
  );
  const publication = await store.savePrepared(prepared);
  return { publication, status: 'prepared', overview: prepared.changesOverview };
}

// Parsing restores the schema's key order, which the change summary relies on. An active
// publication written with an older schema is compared as if there were none.
function readContent(publication: StoredPublication | null): PublicationContent | null {
  if (publication === null) {
    return null;
  }
  const parsed = publicationContentSchema.safeParse(publication.content);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}
