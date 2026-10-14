import type { ModelSettingsRecord } from '@portfolio/cms-schema';
import { z } from 'zod';

// The site stops waiting for a chat reply after 12 seconds.
const MIN_TIMEOUT_MILLISECONDS = 1_000;
const MAX_TIMEOUT_MILLISECONDS = 10_000;

export type ModelSettingsRow = Omit<ModelSettingsRecord, 'id'>;

export type ModelSettings = {
  modelName: string;
  inputPriceEurPerMillion: number;
  outputPriceEurPerMillion: number;
  timeoutMilliseconds: number;
};

export type ModelSettingsStatus =
  | { status: 'configured'; settings: ModelSettings }
  | { status: 'disabled' }
  | { status: 'invalid'; fields: string[] }
  | { status: 'unavailable' };

export type ModelSettingsSource = {
  readSettings(): Promise<ModelSettingsRow>;
};

export type ModelSettingsReader = {
  readStatus(): Promise<ModelSettingsStatus>;
};

export type ModelSettingsReaderDependencies = {
  source: ModelSettingsSource;
  clock: () => Date;
  cacheTtlMilliseconds: number;
  log: (message: string) => void;
};

type CacheEntry = {
  status: ModelSettingsStatus;
  expiresAtMilliseconds: number;
};

const modelSettingsSchema = z.object({
  model: z.string().trim().min(1),
  input_price_eur_per_million: z.number().nonnegative(),
  output_price_eur_per_million: z.number().nonnegative(),
  timeout_ms: z.number().int().min(MIN_TIMEOUT_MILLISECONDS).max(MAX_TIMEOUT_MILLISECONDS),
});

export function resolveModelSettings(row: ModelSettingsRow): ModelSettingsStatus {
  if (row.model === null || row.model.trim() === '') {
    return { status: 'disabled' };
  }
  const parsed = modelSettingsSchema.safeParse(row);
  if (!parsed.success) {
    return { status: 'invalid', fields: invalidFields(parsed.error) };
  }
  return {
    status: 'configured',
    settings: {
      modelName: parsed.data.model,
      inputPriceEurPerMillion: parsed.data.input_price_eur_per_million,
      outputPriceEurPerMillion: parsed.data.output_price_eur_per_million,
      timeoutMilliseconds: parsed.data.timeout_ms,
    },
  };
}

function invalidFields(error: z.ZodError): string[] {
  return [...new Set(error.issues.map((issue) => issue.path.map(String).join('.')))];
}

export function createModelSettingsReader(
  dependencies: ModelSettingsReaderDependencies
): ModelSettingsReader {
  const cache: { current: CacheEntry | null } = { current: null };

  return {
    async readStatus(): Promise<ModelSettingsStatus> {
      const now = dependencies.clock().getTime();
      if (cache.current !== null && cache.current.expiresAtMilliseconds > now) {
        return cache.current.status;
      }
      const row = await readRow(dependencies.source);
      if (row === null) {
        dependencies.log('Model settings unavailable: answering with scripted replies.');
        return { status: 'unavailable' };
      }
      const status = resolveModelSettings(row);
      if (status.status === 'invalid') {
        dependencies.log(
          `Model settings invalid (${status.fields.join(', ')}): answering with scripted replies.`
        );
      }
      cache.current = { status, expiresAtMilliseconds: now + dependencies.cacheTtlMilliseconds };
      return status;
    },
  };
}

async function readRow(source: ModelSettingsSource): Promise<ModelSettingsRow | null> {
  try {
    return await source.readSettings();
  } catch {
    return null;
  }
}
