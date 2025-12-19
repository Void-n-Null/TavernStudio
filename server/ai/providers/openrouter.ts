import { z } from 'zod';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { AiProviderDefinition } from '../providerSchema';

const secretSchema = z.object({
  apiKey: z.string().min(1),
});

export const openRouterProvider: AiProviderDefinition = {
  id: 'openrouter',
  label: 'OpenRouter',
  ui: {
    logoUrl: '/provider/openrouter.svg',
    accentColor: '#ffffff',
    theme: 'violet',
    description: 'Unified API for dozens of models from OpenAI, Anthropic, Google, and more.',
    defaultModelId: 'openai/gpt-4o-mini',
  },
  configSchema: z.object({
    defaultModelId: z.string().min(1).default('openai/gpt-4o-mini'),
    // Optional identity headers recommended by OpenRouter.
    appName: z.string().min(1).optional(),
    appUrl: z.string().url().optional(),
  }),
  authStrategies: [
    {
      id: 'apiKey',
      type: 'apiKey',
      label: 'API Key',
      secretSchema,
      requiredSecretKeys: ['apiKey'],
    },
    {
      id: 'pkce',
      type: 'pkce',
      label: 'OAuth (PKCE)',
      // PKCE still results in a stored API key.
      secretSchema,
      requiredSecretKeys: ['apiKey'],
    },
  ],
  createClient: (secrets, config) => {
    return createOpenRouter({
      apiKey: secrets.apiKey,
      headers: {
        ...(config.appName ? { 'X-Title': config.appName } : {}),
        ...(config.appUrl ? { 'HTTP-Referer': config.appUrl } : {}),
      },
    });
  },
  validate: async (secrets, config) => {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${secrets.apiKey}`,
        ...(config.appName ? { 'X-Title': config.appName } : {}),
        ...(config.appUrl ? { 'HTTP-Referer': config.appUrl } : {}),
      },
    });
    if (!res.ok) {
      throw new Error(`OpenRouter validation failed: ${res.status} ${await res.text()}`);
    }
  },
};

