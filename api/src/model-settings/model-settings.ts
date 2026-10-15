import { createHash } from 'node:crypto';

import type { ModelProviderProfileRecord, ModelSettingsRecord } from '@portfolio/cms-schema';
import { z } from 'zod';

// The site stops waiting for a chat reply after 12 seconds.
const MIN_TIMEOUT_MILLISECONDS = 1_000;
const MAX_TIMEOUT_MILLISECONDS = 10_000;

export type ModelProviderId = 'openrouter' | 'google-ai-studio' | 'openai';
export type ModelSettingsRow =
  | (Omit<ModelSettingsRecord, 'id' | 'active_profile'> & {
      active_profile?: ModelProviderProfileRecord | string | null;
    })
  | { configuration_source: 'profile'; active_profile: ModelProviderProfileRecord | string | null }
  | { configuration_source: 'disabled' };
export type ResolvedModelProfile = ModelSettings & {
  profileId: string | null;
  providerId: ModelProviderId;
  configurationFingerprint: string;
  configurationSource: 'legacy' | 'profile';
};

const reasoningEffortSchema = z.enum(['none', 'low', 'medium', 'high']);

export type ReasoningEffort = z.infer<typeof reasoningEffortSchema>;

export type ModelSettings = {
  profileId?: string | null;
  providerId?: ModelProviderId;
  configurationFingerprint?: string;
  configurationSource?: 'legacy' | 'profile';
  modelName: string;
  inputPriceEurPerMillion: number;
  cacheReadPriceEurPerMillion: number;
  cacheWritePriceEurPerMillion: number;
  outputPriceEurPerMillion: number;
  reasoningEffort: ReasoningEffort | null;
  timeoutMilliseconds: number;
  maxInputBytes?: number;
  maxOutputTokens?: number | null;
  responseCacheEnabled?: boolean;
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

export const modelSettingsSchema = z.object({
  max_input_bytes: z.number().int().positive().default(65536),
  max_output_tokens: z.number().int().positive().nullable().default(null),
  response_cache_enabled: z.boolean().default(false),
  model: z.string().trim().min(1),
  input_price_eur_per_million: z.number().nonnegative(),
  output_price_eur_per_million: z.number().nonnegative(),
  cache_read_price_eur_per_million: z.number().nonnegative().nullable(),
  cache_write_price_eur_per_million: z.number().nonnegative().nullable(),
  reasoning_effort: reasoningEffortSchema.nullable(),
  timeout_ms: z.number().int().min(MIN_TIMEOUT_MILLISECONDS).max(MAX_TIMEOUT_MILLISECONDS),
});

export function resolveModelSettings(row: ModelSettingsRow): ModelSettingsStatus {
  if (row.configuration_source === 'disabled') return { status: 'disabled' };
  if (row.configuration_source === 'profile') {
    if (row.active_profile == null) return { status: 'disabled' };
    if (typeof row.active_profile === 'string')
      return { status: 'invalid', fields: ['active_profile'] };
    const profile = row.active_profile;
    if (!['openrouter', 'google-ai-studio', 'openai'].includes(profile.provider))
      return { status: 'invalid', fields: ['provider'] };
    const resolved = resolveModelSettings({ ...profile, configuration_source: 'legacy' });
    if (resolved.status !== 'configured') return resolved;
    const provider = z.enum(['openrouter', 'google-ai-studio', 'openai']).parse(profile.provider);
    return {
      status: 'configured',
      settings: {
        ...resolved.settings,
        configurationSource: 'profile',
        providerId: provider,
        profileId: profile.id,
        configurationFingerprint: fingerprint({ ...profile, provider }),
      },
    };
  }
  if (row.model === null || row.model.trim() === '') {
    return { status: 'disabled' };
  }
  const parsed = modelSettingsSchema.safeParse(row);
  if (!parsed.success) {
    return { status: 'invalid', fields: invalidFields(parsed.error) };
  }
  const inputPrice = parsed.data.input_price_eur_per_million;
  return {
    status: 'configured',
    settings: {
      configurationSource: 'legacy',
      providerId: 'openrouter',
      profileId: null,
      configurationFingerprint: fingerprint(parsed.data),
      maxInputBytes: parsed.data.max_input_bytes,
      maxOutputTokens: parsed.data.max_output_tokens,
      responseCacheEnabled: parsed.data.response_cache_enabled,
      modelName: parsed.data.model,
      inputPriceEurPerMillion: inputPrice,
      cacheReadPriceEurPerMillion: parsed.data.cache_read_price_eur_per_million ?? inputPrice,
      cacheWritePriceEurPerMillion: parsed.data.cache_write_price_eur_per_million ?? inputPrice,
      outputPriceEurPerMillion: parsed.data.output_price_eur_per_million,
      reasoningEffort: parsed.data.reasoning_effort,
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

function fingerprint(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify({ contract: 1, value }))
    .digest('hex');
}
