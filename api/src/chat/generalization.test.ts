import { unavailableText } from '@portfolio/chat';
import { validatePublicationContent } from '@portfolio/content';
import { describe, expect, it } from 'vitest';
import {
  corpusMutations,
  developmentSeeds,
  heldOutSeeds,
  makeCmsCorpus,
} from './testing/cms-corpus.ts';

describe('independent CMS corpus', () => {
  it.each([...developmentSeeds, ...heldOutSeeds])(
    'validates every mutation and preserves entity associations for seed %i',
    (seed) => {
      for (const mutation of corpusMutations) {
        const corpus = makeCmsCorpus(seed, mutation);
        expect(validatePublicationContent(corpus.active.content).valid).toBe(true);
        for (const fact of corpus.expectedFacts) {
          const entity = [
            ...corpus.active.content.experiences,
            ...corpus.active.content.projects,
          ].find((entry) => entry.slug === fact.entitySlug);
          expect(JSON.stringify(entity)).toContain(fact.value);
        }
      }
      const previous = makeCmsCorpus(seed, 'initial');
      const updated = makeCmsCorpus(seed, 'updated');
      expect(updated.active.publicationId).not.toBe(previous.active.publicationId);
      expect(updated.expectedFacts).not.toEqual(previous.expectedFacts);
      expect(
        makeCmsCorpus(seed, 'deleted').active.content.experiences.some(
          (entry) => entry.slug === `company-${seed}-a`
        )
      ).toBe(false);
    }
  );
});

// These are behavior requirements, not expectations of the old scripted fallback.
// The isolated baseline trace records their pre-optimization failures.
import { createChatService } from './chat-service.ts';
import { createScriptedMatcherCache } from './scripted-matcher-cache.ts';
import { createMemoryRateLimiter } from '../rate-limit/memory-rate-limiter.ts';
import { createWithinBudgetGate } from '../budget/monthly-budget.ts';

describe('operational failures with changing publications', () => {
  it.each(developmentSeeds)(
    'does not substitute another company after timeout (seed %i)',
    async (seed) => {
      for (const mutation of corpusMutations) {
        const corpus = makeCmsCorpus(seed, mutation);
        const service = createChatService({
          readActivePublication: async () => corpus.active,
          matcherCache: createScriptedMatcherCache(),
          budgetGate: createWithinBudgetGate(),
          rateLimiter: createMemoryRateLimiter(),
          exchangeRecorder: { record: async () => undefined },
          clock: () => new Date(),
          modelMode: {
            dailyCallLimit: 60,
            model: { complete: async () => ({ status: 'timeout' }) },
            readSettings: async () => ({
              status: 'configured',
              settings: {
                modelName: 'fixture:free',
                reasoningEffort: null,
                timeoutMilliseconds: 10000,
                inputPriceEurPerMillion: 0,
                outputPriceEurPerMillion: 0,
                cacheReadPriceEurPerMillion: 0,
                cacheWritePriceEurPerMillion: 0,
                profileId: null,
                providerId: 'openrouter',
                configurationFingerprint: 'offline-fixture',
                configurationSource: 'legacy',
                responseCacheEnabled: false,
              },
            }),
          },
        });
        const response = await service.handle(corpus.request, `visitor-${mutation}`);
        expect(response.status).toBe(200);
        if (!('reply' in response.body)) throw new Error('Expected a public ChatResponse');
        const { reply } = response.body;
        for (const fact of corpus.forbiddenFacts) expect(reply.text).not.toContain(fact.value);
        expect(JSON.stringify(reply)).not.toContain(`company-${seed}-b`);
        // Only the conflicting publication holds a published answer about the company asked for.
        if (mutation === 'conflicting') {
          expect(reply).toMatchObject({
            outcome: 'answered',
            answerSlugs: [`contradiction-${seed}`],
          });
          continue;
        }
        expect(reply).toMatchObject({
          outcome: 'temporarily_unavailable',
          text: unavailableText('en'),
          blocks: [],
        });
      }
    }
  );
});
