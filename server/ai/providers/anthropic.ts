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
};

