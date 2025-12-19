import { z } from 'zod';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { AiProviderDefinition } from '../providerSchema';

export const anthropicProvider: AiProviderDefinition = {
  id: 'anthropic',
  label: 'Anthropic',
  ui: {
    logoUrl: '/provider/anthropic.svg',
    accentColor: '#D97757',
    theme: 'orange',
    description: 'High-quality Claude models with large context windows and strong reasoning.',
    defaultModelId: 'claude-3-5-sonnet-20241022',
  },
  configSchema: z.object({
    defaultModelId: z.string().min(1).default('claude-3-5-sonnet-20241022'),
    baseURL: z.string().url().optional(),
  }),
  authStrategies: [
    {
      id: 'apiKey',
      type: 'apiKey',
      label: 'API Key',
      secretSchema: z.object({
        apiKey: z.string().min(1),
      }),
      requiredSecretKeys: ['apiKey'],
    },
  ],
  createClient: (secrets, config) => {
    return createAnthropic({
      apiKey: secrets.apiKey,
      baseURL: config.baseURL,
      headers: {
        'anthropic-version': '2023-06-01',
      },
    });
  },
  validate: async (secrets, config) => {
    const baseURL = config.baseURL ?? 'https://api.anthropic.com/v1';
    const res = await fetch(`${baseURL}/models`, {
      headers: {
        'x-api-key': secrets.apiKey,
        'anthropic-version': '2023-06-01',
      },
    });
    if (!res.ok) {
      throw new Error(`Anthropic validation failed: ${res.status} ${await res.text()}`);
    }
  },
  listModels: async (secrets) => {
    if (!secrets.apiKey) return [];

    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': secrets.apiKey,
        'anthropic-version': '2023-06-01',
      },
    });

    if (!res.ok) {
      console.error(`[anthropic] Failed to fetch models: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json() as { data: Array<{ id: string; display_name?: string }> };
    return data.data.map((m) => ({
      id: m.id,
      label: m.display_name || m.id,
    }));
  },
};

