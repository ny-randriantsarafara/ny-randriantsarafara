import { PublicationSelectionError } from '../errors.ts';
import { isRecord } from '../guards.ts';

export function readSelectedPublicationId(flowData: Record<string, unknown>): string {
  const trigger = flowData['$trigger'];
  if (!isRecord(trigger)) {
    throw new PublicationSelectionError();
  }
  const body = trigger['body'];
  if (!isRecord(body)) {
    throw new PublicationSelectionError();
  }
  const keys = body['keys'];
  if (!Array.isArray(keys)) {
    throw new PublicationSelectionError();
  }
  const selectedKeys: unknown[] = keys;
  const [publicationId] = selectedKeys;
  if (selectedKeys.length !== 1 || typeof publicationId !== 'string' || publicationId === '') {
    throw new PublicationSelectionError();
  }
  return publicationId;
}
