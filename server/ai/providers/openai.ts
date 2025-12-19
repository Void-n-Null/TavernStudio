import { z } from 'zod';
import { createOpenAI } from '@ai-sdk/openai';
import type { AiProviderDefinition } from '../providerSchema';

export const openAIProvider: AiProviderDefinition = {
  id: 'openai',
  label: 'OpenAI (ChatGPT)',
  ui: {
    logoUrl: '/provider/openai.svg',
    accentColor: '#ffffff',
    theme: 'zinc',
    description: 'The industry standard, offering GPT-4o and GPT-4o-mini.',
    defaultModelId: 'gpt-4o-mini',
  },
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
  createClient: (secrets, config) => {
    return createOpenAI({
      apiKey: secrets.apiKey,
      baseURL: config.baseURL,
      headers: {
        ...(config.organization ? { 'OpenAI-Organization': config.organization } : {}),
        ...(config.project ? { 'OpenAI-Project': config.project } : {}),
      },
    });
  },
  validate: async (secrets, config) => {
    const baseURL = config.baseURL ?? 'https://api.openai.com/v1';
    const res = await fetch(`${baseURL}/models`, {
      headers: {
        Authorization: `Bearer ${secrets.apiKey}`,
        ...(config.organization ? { 'OpenAI-Organization': config.organization } : {}),
        ...(config.project ? { 'OpenAI-Project': config.project } : {}),
      },
    });
    if (!res.ok) {
      throw new Error(`OpenAI validation failed: ${res.status} ${await res.text()}`);
    }
  },
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

