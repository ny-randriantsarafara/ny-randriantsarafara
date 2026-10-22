import type {
  ModelSettings,
  ResolvedModelProfile,
  ModelProviderId,
} from '../model-settings/model-settings.ts';
import type { ChatModel } from './chat-model.ts';
import { createOpenAiCompatibleModel } from './openai-compatible-model.ts';

export type ModelProviderCredentials = Partial<Record<ModelProviderId, { apiKey: string }>>;
export type ModelProviderRegistry = {
  forProfile(profile: ModelSettings & Partial<ResolvedModelProfile>): ChatModel | null;
};
const providerBases: Record<ModelProviderId, string> = {
  openrouter: 'https://openrouter.ai/api/v1',
  'google-ai-studio': 'https://generativelanguage.googleapis.com/v1beta/openai',
  openai: 'https://api.openai.com/v1',
};
export function createModelProviderRegistry(
  credentials: ModelProviderCredentials,
  fetchImpl: typeof fetch
): ModelProviderRegistry {
  return {
    forProfile(profile) {
      const providerId = profile.providerId ?? 'openrouter';
      const credential = credentials[providerId];
      if (credential === undefined) return null;
      // Gemini Pro/3 cannot disable thinking; never silently reinterpret an owner's choice.
      if (
        providerId === 'google-ai-studio' &&
        profile.reasoningEffort === 'none' &&
        (!profile.modelName.startsWith('gemini-2.5-') || profile.modelName.includes('pro'))
      )
        return null;
      return createOpenAiCompatibleModel({
        providerId,
        provider: { baseUrl: providerBases[providerId], apiKey: credential.apiKey },
        fetchImpl,
        createAbortSignal: AbortSignal.timeout,
      });
    },
  };
}

// A custom compatible endpoint is not necessarily the provider assumed by legacy CMS settings.
export function knownProviderId(baseUrl: string): string | null {
  const hostname = new URL(baseUrl).hostname;
  if (hostname === 'openrouter.ai') return 'openrouter';
  if (hostname === 'api.openai.com') return 'openai';
  if (hostname === 'generativelanguage.googleapis.com') return 'google-ai-studio';
  return null;
}
