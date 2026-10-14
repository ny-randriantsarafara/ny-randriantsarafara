import { createScriptedMatcher, type ScriptedMatcher } from '@portfolio/chat';
import type { PublicationContent } from '@portfolio/content';

export type ScriptedMatcherCache = {
  matcherFor(publicationId: string, content: PublicationContent): ScriptedMatcher;
};

export function createScriptedMatcherCache(): ScriptedMatcherCache {
  const matchers = new Map<string, ScriptedMatcher>();

  return {
    matcherFor(publicationId: string, content: PublicationContent): ScriptedMatcher {
      const existing = matchers.get(publicationId);
      if (existing !== undefined) {
        return existing;
      }
      const matcher = createScriptedMatcher(content);
      matchers.set(publicationId, matcher);
      return matcher;
    },
  };
}
