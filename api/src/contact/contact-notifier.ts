import type { ContactRequest } from './contact-request.ts';

export type ContactNotifier = {
  notify(request: ContactRequest): Promise<void>;
};

export function createNoopContactNotifier(): ContactNotifier {
  return {
    async notify(): Promise<void> {
      return;
    },
  };
}
