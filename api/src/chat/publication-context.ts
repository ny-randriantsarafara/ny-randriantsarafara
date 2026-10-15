import { Buffer } from 'node:buffer';
import type { ActivePublication, Locale } from '@portfolio/content';
import { buildEvidenceSources, type EvidenceSource } from './evidence.ts';
import { createModelJsonSchema } from './model-output-schema.ts';
import { buildPublicationInstructions } from './prompt-builder.ts';
export const CHAT_CONTRACT_VERSION = 'cms-chat-v3-evidence';
export type CompiledPublicationContext = {
  publicationId: string;
  locale: Locale;
  instructions: string;
  outputSchema: ReturnType<typeof createModelJsonSchema>;
  evidenceSources: ReadonlyMap<string, EvidenceSource>;
  contractVersion: string;
};
export type PublicationContext = CompiledPublicationContext;
export function createPublicationContextCache() {
  const entries = new Map<string, { context: PublicationContext; bytes: number }>();
  let totalBytes = 0;
  return {
    get(active: ActivePublication, locale: Locale): PublicationContext {
      const key = JSON.stringify([active.publicationId, locale]);
      const found = entries.get(key);
      if (found !== undefined) {
        entries.delete(key);
        entries.set(key, found);
        return found.context;
      }
      const evidenceSources = new Map(
        buildEvidenceSources(active.content, locale).map((source) => [source.id, source])
      );
      const context: PublicationContext = {
        publicationId: active.publicationId,
        locale,
        instructions: buildPublicationInstructions(active.content, locale),
        outputSchema: createModelJsonSchema(active.content, locale, evidenceSources),
        evidenceSources,
        contractVersion: CHAT_CONTRACT_VERSION,
      };
      const bytes =
        Buffer.byteLength(context.instructions) +
        Buffer.byteLength(JSON.stringify(context.outputSchema)) +
        Buffer.byteLength(JSON.stringify([...evidenceSources.values()]));
      if (bytes <= 2 * 1024 * 1024) {
        while (entries.size >= 4 || totalBytes + bytes > 2 * 1024 * 1024) {
          const oldest = entries.entries().next().value;
          if (oldest === undefined) break;
          entries.delete(oldest[0]);
          totalBytes -= oldest[1].bytes;
        }
        entries.set(key, { context, bytes });
        totalBytes += bytes;
      }
      return context;
    },
  };
}
