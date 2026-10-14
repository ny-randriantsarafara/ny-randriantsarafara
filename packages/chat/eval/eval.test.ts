import type { BlockType } from '@portfolio/content';
import { initialContent } from '@portfolio/cms-provision/seed';
import { describe, expect, it } from 'vitest';

import { createScriptedMatcher } from '../src/matcher.ts';
import { englishEvalCases } from './cases-en.ts';
import { frenchEvalCases } from './cases-fr.ts';
import type { EvalCase } from './types.ts';

const MIN_ACCURACY = 0.8;

function sortedBlockTypes(types: BlockType[]): BlockType[] {
  return [...types].sort((left, right) => left.localeCompare(right));
}

function caseMatches(
  evalCase: EvalCase,
  reply: ReturnType<ReturnType<typeof createScriptedMatcher>['reply']>['reply']
): boolean {
  if (reply.outcome !== evalCase.expectedOutcome) {
    return false;
  }
  if (evalCase.expectedOutcome === 'answered') {
    if (reply.answerSlugs[0] !== evalCase.expectedAnswerSlug) {
      return false;
    }
    const actualTypes = sortedBlockTypes(reply.blocks.map((block) => block.type));
    const expectedTypes = sortedBlockTypes(evalCase.expectedBlockTypes);
    return JSON.stringify(actualTypes) === JSON.stringify(expectedTypes);
  }
  return true;
}

function accuracyFor(cases: EvalCase[]): { accuracy: number; misses: string[] } {
  const matcher = createScriptedMatcher(initialContent);
  const misses: string[] = [];

  const correct = cases.reduce((count, evalCase) => {
    const result = matcher.reply(evalCase.question, evalCase.locale);
    const matches = caseMatches(evalCase, result.reply);
    if (!matches) {
      misses.push(
        `[${evalCase.locale}] "${evalCase.question}" -> outcome=${result.reply.outcome}, slug=${result.reply.answerSlugs[0] ?? 'none'}, blocks=${result.reply.blocks.map((block) => block.type).join(',')}`
      );
    }
    return count + (matches ? 1 : 0);
  }, 0);

  return { accuracy: correct / cases.length, misses };
}

describe('scripted matcher evaluation set', () => {
  it('meets top-1 accuracy on English recruiter questions', () => {
    const { accuracy, misses } = accuracyFor(englishEvalCases);
    if (accuracy < MIN_ACCURACY) {
      console.error(`English accuracy ${accuracy.toFixed(3)} misses:\n${misses.join('\n')}`);
    }
    expect(accuracy).toBeGreaterThanOrEqual(MIN_ACCURACY);
  });

  it('meets top-1 accuracy on French recruiter questions', () => {
    const { accuracy, misses } = accuracyFor(frenchEvalCases);
    if (accuracy < MIN_ACCURACY) {
      console.error(`French accuracy ${accuracy.toFixed(3)} misses:\n${misses.join('\n')}`);
    }
    expect(accuracy).toBeGreaterThanOrEqual(MIN_ACCURACY);
  });
});
