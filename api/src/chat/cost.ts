import type { ModelSettings } from '../model-settings/model-settings.ts';
import type { ChatModelUsage } from './chat-model.ts';

// Without max_output_tokens the provider bounds nothing; the reservation then assumes this many
// output tokens and holds the budget only approximately.
const ASSUMED_MAX_OUTPUT_TOKENS = 2_000;

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

// The most a generation can cost: no token is shorter than one byte, and the whole input may
// be written to the prompt cache.
export function estimateReservationEur(settings: ModelSettings, inputBytes: number): number {
  const inputPricePerMillion = Math.max(
    settings.inputPriceEurPerMillion,
    settings.cacheWritePriceEurPerMillion
  );
  const outputTokens = settings.maxOutputTokens ?? ASSUMED_MAX_OUTPUT_TOKENS;
  const costMicroEur =
    inputBytes * inputPricePerMillion + outputTokens * settings.outputPriceEurPerMillion;
  return Math.ceil(costMicroEur) / 1_000_000;
}

function roundEur(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
