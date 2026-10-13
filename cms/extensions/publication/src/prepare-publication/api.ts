import { defineOperationApi } from '@directus/extensions-sdk';
import { PREPARE_OPERATION } from '@portfolio/cms-schema/operations';

import { openPublicationStore } from '../directus-store.ts';
import { preparePublication } from './prepare.ts';

export default defineOperationApi<Record<string, never>>({
  id: PREPARE_OPERATION,
  handler: async (_options, context) => preparePublication(await openPublicationStore(context)),
});
