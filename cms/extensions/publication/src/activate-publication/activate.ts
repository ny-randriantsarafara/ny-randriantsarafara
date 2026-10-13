import { validatePublicationContent } from '@portfolio/content';

import { invalidContentError, PublicationStateError } from '../errors.ts';
import type { PublicationStore, StoredPublication } from '../publication-store.ts';

export type ActivationStep = 'activate' | 'notify-again';
export type NotifyApi = (publicationId: string) => Promise<void>;

export type ActivationResult = { publication: string; status: 'active'; step: ActivationStep };

export type ActivationDependencies = {
  store: PublicationStore;
  notify: NotifyApi;
  now: () => Date;
};

export function planActivation(publication: StoredPublication): ActivationStep {
  if (publication.status === 'active') {
    return 'notify-again';
  }
  if (publication.status === 'discarded') {
    throw new PublicationStateError({ status: publication.status });
  }
  // The owner may edit a publication row by hand: only valid content goes live.
  const validation = validatePublicationContent(publication.content);
  if (!validation.valid) {
    throw invalidContentError(validation.problems);
  }
  return 'activate';
}

export async function activatePublication(
  publicationId: string,
  dependencies: ActivationDependencies
): Promise<ActivationResult> {
  const publication = await dependencies.store.readPublication(publicationId);
  const step = planActivation(publication);
  if (step === 'activate') {
    await dependencies.store.activate(publication.id, dependencies.now());
  }
  await dependencies.notify(publication.id);
  return { publication: publication.id, status: 'active', step };
}
