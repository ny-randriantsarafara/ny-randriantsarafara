import type { ModelSettings } from '../model-settings/model-settings.ts';

export function computeModelCostEur(
  settings: ModelSettings,
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = (inputTokens * settings.inputPriceEurPerMillion) / 1_000_000;
  const outputCost = (outputTokens * settings.outputPriceEurPerMillion) / 1_000_000;
  return roundEur(inputCost + outputCost);
}

function roundEur(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
