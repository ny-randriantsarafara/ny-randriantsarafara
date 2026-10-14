import { createDirectus, createItem, rest, staticToken } from '@directus/sdk';
import type { PortfolioSchema } from '@portfolio/cms-schema';

import type { ContactRequest } from './contact-request.ts';

export type ContactStore = {
  save(request: ContactRequest, messageId: string): Promise<void>;
};

export function createDirectusContactStore(directusUrl: string, apiToken: string): ContactStore {
  const client = createDirectus<PortfolioSchema>(directusUrl, {
    globals: {
      fetch: globalThis.fetch,
      WebSocket: globalThis.WebSocket,
      URL: globalThis.URL,
      logger: globalThis.console,
    },
  })
    .with(staticToken(apiToken))
    .with(rest());

  return {
    async save(request: ContactRequest, messageId: string): Promise<void> {
      await client.request(
        createItem('contact_messages', {
          id: messageId,
          name: request.name,
          email: request.email,
          company: request.company ?? null,
          message: request.message,
          locale: request.locale,
          topic: request.topic ?? null,
          status: 'new',
        })
      );
    },
  };
}
