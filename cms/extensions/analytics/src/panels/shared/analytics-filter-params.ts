import { computed, type ComputedRef } from 'vue';
import { useStores } from '@directus/extensions-sdk';

const variableToQueryKey: Record<string, string> = {
  analytics_locale: 'locale',
  analytics_environment: 'environment',
  analytics_device_class: 'device_class',
  analytics_utm_source: 'utm_source',
  analytics_model: 'model',
  analytics_provider_id: 'provider_id',
  analytics_publication_id: 'publication_id',
};

export function useAnalyticsFilterParams(): ComputedRef<Record<string, string>> {
  return computed(() => readAnalyticsFilterParams(readInsightsVariables()));
}

export function readInsightsStoreVariables(store: unknown): Record<string, unknown> {
  if (store === null || typeof store !== 'object' || !('variables' in store)) {
    return {};
  }
  const variables = store.variables;
  if (variables === null || typeof variables !== 'object' || Array.isArray(variables)) {
    return {};
  }
  const record: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(variables)) {
    record[key] = value;
  }
  return record;
}

export function readAnalyticsFilterParams(
  variables: Record<string, unknown>
): Record<string, string> {
  const params: Record<string, string> = {};
  for (const [variableField, queryKey] of Object.entries(variableToQueryKey)) {
    const raw = variables[variableField];
    if (typeof raw !== 'string') {
      continue;
    }
    const trimmed = raw.trim();
    if (trimmed === '') {
      continue;
    }
    params[queryKey] = trimmed;
  }
  return params;
}

function readInsightsVariables(): Record<string, unknown> {
  try {
    const stores = useStores();
    if (!('useInsightsStore' in stores) || typeof stores.useInsightsStore !== 'function') {
      return {};
    }
    return readInsightsStoreVariables(stores.useInsightsStore());
  } catch {
    return {};
  }
}
