import { defineOperationApi } from '@directus/extensions-sdk';
import { ACTIVATE_OPERATION } from '@portfolio/cms-schema/operations';

import { openPublicationStore } from '../directus-store.ts';
import { activatePublication } from './activate.ts';
import { notifyPublicationHook, readHookConfiguration } from './hook.ts';
import { readSelectedPublicationId } from './trigger.ts';

export default defineOperationApi<Record<string, never>>({
  id: ACTIVATE_OPERATION,
  handler: async (_options, context) => {
    const publicationId = readSelectedPublicationId(context.data);
    const hook = readHookConfiguration(context.env);
    return activatePublication(publicationId, {
      store: await openPublicationStore(context),
      notify: (id) => notifyPublicationHook(hook, id, fetch),
      now: () => new Date(),
    });
  },
});
