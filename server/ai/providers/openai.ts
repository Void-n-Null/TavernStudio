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
};

