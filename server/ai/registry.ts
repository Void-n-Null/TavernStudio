import type { AiProviderDefinition } from './providerSchema';
import { anthropicProvider } from './providers/anthropic';
import { openAIProvider } from './providers/openai';
import { openRouterProvider } from './providers/openrouter';

export const aiProviders: readonly AiProviderDefinition[] = [
  openRouterProvider,
  anthropicProvider,
  openAIProvider,
] as const;

export function getProviderOrThrow(providerId: string): AiProviderDefinition {
  const found = aiProviders.find((p) => p.id === providerId);
  if (!found) throw new Error(`Unknown provider: ${providerId}`);
  return found;
}

