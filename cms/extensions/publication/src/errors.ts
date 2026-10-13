import { createError } from '@directus/errors';
import type { PublicationProblem } from '@portfolio/content';

export const PublicationInvalidError = createError<{ problems: string }>(
  'PUBLICATION_INVALID',
  ({ problems }) => `The content cannot be published yet:\n${problems}`,
  400
);

export const NothingToPublishError = createError(
  'NOTHING_TO_PUBLISH',
  'Nothing changed since the active publication.',
  400
);

export const PublicationSelectionError = createError(
  'PUBLICATION_SELECTION',
  'Select exactly one publication.',
  400
);

export const PublicationStateError = createError<{ status: string }>(
  'PUBLICATION_STATE',
  ({ status }) => `A ${status} publication cannot be published. Prepare a new one.`,
  409
);

export const PublicationHookError = createError<{ publication: string; reason: string }>(
  'PUBLICATION_HOOK_FAILED',
  ({ publication, reason }) =>
    `Publication ${publication} is active, but the API was not notified (${reason}). Run Publish on it again to retry.`,
  502
);

export const PublicationConfigurationError = createError<{ variable: string }>(
  'PUBLICATION_CONFIGURATION',
  ({ variable }) => `Incomplete configuration: ${variable} is missing.`,
  503
);

export function invalidContentError(problems: readonly PublicationProblem[]) {
  return new PublicationInvalidError({
    problems: problems.map((problem) => `- ${problem.path}: ${problem.message}`).join('\n'),
  });
}
