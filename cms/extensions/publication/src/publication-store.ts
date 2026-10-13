import type { PublicationStatus, WorkingRecords } from '@portfolio/cms-schema';
import type { ChangeSummary, PublicationContent } from '@portfolio/content';

export type StoredPublication = { id: string; status: PublicationStatus; content: unknown };

export type PreparedPublication = {
  content: PublicationContent;
  changes: ChangeSummary;
  changesOverview: string;
};

export type PublicationStore = {
  readWorkingRecords(): Promise<WorkingRecords>;
  readActivePublication(): Promise<StoredPublication | null>;
  readPublication(id: string): Promise<StoredPublication>;
  /** Discards every earlier prepared publication in the same transaction. Returns the new id. */
  savePrepared(publication: PreparedPublication): Promise<string>;
  /** Supersedes the active publication in the same transaction. */
  activate(id: string, activatedAt: Date): Promise<void>;
};
