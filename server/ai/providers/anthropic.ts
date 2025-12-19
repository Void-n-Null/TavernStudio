import { z } from 'zod';
import type { AiProviderDefinition } from '../providerSchema';

export const anthropicProvider: AiProviderDefinition = {
  id: 'anthropic',
  label: 'Anthropic',
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

