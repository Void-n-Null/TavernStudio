import { z } from 'zod';

export type AuthStrategyType = 'apiKey' | 'pkce';

/**
 * Schema-driven description of how a provider is authenticated.
 *
 * IMPORTANT: even PKCE ultimately yields a stored API key for OpenRouter.
 * PKCE just changes *how the key is obtained* (oauth flow vs manual paste).
 */
export type AuthStrategyDefinition = {
  id: string; // e.g. "apiKey", "pkce"
  type: AuthStrategyType;
  label: string;
  /**
   * Secret payload schema (encrypted and stored).
   * Example: { apiKey: string }
   */
  secretSchema: z.ZodTypeAny;
  /**
   * List of secret keys inside secretSchema that must exist for the strategy
   * to be considered "configured".
   */
  requiredSecretKeys: string[];
};

export type AiProviderDefinition = {
  id: string; // "openrouter" | "openai" | "anthropic" | ...
  label: string;
  /**
   * Non-secret config: safe to return to the client.
   * Example: defaultModelId, baseURL, request options...
   */
  configSchema: z.ZodTypeAny;
  /**
   * How this provider can be authenticated.
   * Most providers will have one. OpenRouter can support both apiKey and pkce.
   */
  authStrategies: AuthStrategyDefinition[];
};

export type ProviderId = AiProviderDefinition['id'];

