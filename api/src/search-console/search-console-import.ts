import { parisDayKey } from '../time/paris-calendar.ts';
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
  const endDate = parisDayKey(dependencies.clock);
  const startDate = shiftParisDayKey(endDate, -(IMPORT_DAYS - 1));
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

function shiftParisDayKey(dayKey: string, dayOffset: number): string {
  const [yearText, monthText, dayText] = dayKey.split('-');
  const year = Number.parseInt(yearText ?? '', 10);
  const month = Number.parseInt(monthText ?? '', 10);
  const day = Number.parseInt(dayText ?? '', 10);
  const shifted = new Date(Date.UTC(year, month - 1, day + dayOffset));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'unexpected error';
}
