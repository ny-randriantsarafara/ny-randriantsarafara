import { listRecentParisDayKeys, parisDayKey } from '../time/paris-calendar.ts';
import type { RaiseAlert } from '../alerts/raise-alert.ts';
import type { SearchConsoleClient } from './search-console-client.ts';
import type { SearchConsoleStore } from './directus-search-console-store.ts';

const IMPORT_DAYS = 10;

export type SearchConsoleImportJob = {
  run(): Promise<void>;
};

export type SearchConsoleImportDependencies = {
  client: SearchConsoleClient;
  store: SearchConsoleStore;
  raiseAlert: RaiseAlert;
  clock: () => Date;
  log: (message: string) => void;
};

export function createSearchConsoleImportJob(
  dependencies: SearchConsoleImportDependencies
): SearchConsoleImportJob {
  return {
    run: () => runImport(dependencies),
  };
}

async function runImport(dependencies: SearchConsoleImportDependencies): Promise<void> {
  const days = listRecentParisDayKeys(dependencies.clock, IMPORT_DAYS);
  const startDate = days[0] ?? parisDayKey(dependencies.clock);
  const endDate = days[days.length - 1] ?? parisDayKey(dependencies.clock);
  try {
    const rows = await dependencies.client.queryRange(startDate, endDate);
    const outcome = await dependencies.store.upsertRows(rows);
    dependencies.log(
      `Search Console import stored ${rows.length} rows (${outcome.created} created, ${outcome.updated} updated).`
    );
  } catch (error) {
    dependencies.log(`Search Console import failed: ${describeError(error)}`);
    await dependencies.raiseAlert({
      kind: 'search_console',
      dedupKey: `search-console:${endDate}`,
      subject: 'Search Console import failed',
      text: 'The daily Search Console import did not complete.',
      details: { day: endDate },
    });
  }
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'unexpected error';
}
