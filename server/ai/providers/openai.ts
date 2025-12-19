import { z } from 'zod';
import type { AiProviderDefinition } from '../providerSchema';

export const openAIProvider: AiProviderDefinition = {
  id: 'openai',
  label: 'OpenAI (ChatGPT)',
  configSchema: z.object({
    defaultModelId: z.string().min(1).default('gpt-4o-mini'),
    organization: z.string().min(1).optional(),
    project: z.string().min(1).optional(),
    baseURL: z.string().url().optional(), // for proxies; leave undefined for default
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

    const res = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${secrets.apiKey}`,
      },
    });

    if (!res.ok) {
      console.error(`[openai] Failed to fetch models: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json() as { data: Array<{ id: string; owned_by: string }> };
    return data.data.map((m) => ({
      id: m.id,
      label: m.id, // OpenAI doesn't provide display names
    }));
  },
};

