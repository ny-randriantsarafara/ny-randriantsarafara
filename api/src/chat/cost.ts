import type { ModelSettings } from '../model-settings/model-settings.ts';
import type { ChatModelUsage } from './chat-model.ts';

export function computeModelCostEur(settings: ModelSettings, usage: ChatModelUsage): number {
  const uncachedInputTokens = Math.max(
    0,
    usage.inputTokens - usage.cacheReadTokens - usage.cacheWriteTokens
  );
  const tokenCost =
    uncachedInputTokens * settings.inputPriceEurPerMillion +
    usage.cacheReadTokens * settings.cacheReadPriceEurPerMillion +
    usage.cacheWriteTokens * settings.cacheWritePriceEurPerMillion +
    usage.outputTokens * settings.outputPriceEurPerMillion;
  return roundEur(tokenCost / 1_000_000);
}

function roundEur(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
