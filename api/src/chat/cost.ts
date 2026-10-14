import type { ModelConfiguration } from '../environment.ts';

export function computeModelCostEur(
  configuration: ModelConfiguration,
  inputTokens: number,
  outputTokens: number
): number {
  const inputCost = (inputTokens * configuration.inputPriceEurPerMillion) / 1_000_000;
  const outputCost = (outputTokens * configuration.outputPriceEurPerMillion) / 1_000_000;
  return roundEur(inputCost + outputCost);
}

function roundEur(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
