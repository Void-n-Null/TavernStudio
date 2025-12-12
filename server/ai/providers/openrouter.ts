import { z } from 'zod';
import type { AiProviderDefinition } from '../providerSchema';

const secretSchema = z.object({
  apiKey: z.string().min(1),
});

export const openRouterProvider: AiProviderDefinition = {
  id: 'openrouter',
  label: 'OpenRouter',
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
};

