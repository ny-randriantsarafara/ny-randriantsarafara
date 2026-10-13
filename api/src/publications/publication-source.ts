import type { ActivePublication } from '@portfolio/content';

export type PublicationSource = {
  readActive(): Promise<ActivePublication | null>;
  ping(): Promise<boolean>;
};

export class PublicationSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PublicationSourceError';
  }
}
