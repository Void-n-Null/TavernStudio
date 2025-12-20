/**
 * Profile type definitions.
 * A Profile stores a complete MessageStyleConfig for UI customization.
 */

import type { MessageStyleConfig } from './messageStyle';

/**
 * OpenRouter provider routing configuration.
 * Controls which infrastructure providers serve requests and their priority.
 * @see https://openrouter.ai/docs/guides/routing/provider-selection
 */
export interface OpenRouterProviderConfig {
  /** Provider slugs to try in order (e.g., ["anthropic", "together"]) */
  order?: string[];
  /** Provider slugs to exclude from routing */
  ignore?: string[];
  /** Exclusive provider list - only use these providers */
  allow?: string[];
  /** Enable/disable automatic fallback to other providers (default: true) */
  allowFallbacks?: boolean;
  /** Only use providers that support all parameters in request (default: false) */
  requireParameters?: boolean;
  /** Allowed quantization levels (e.g., ["fp16", "int8", "fp8", "bf16"]) */
  quantizations?: string[];
}

export interface AiConfig {
  id: string;
  name: string;
  providerId: string;
  authStrategyId: string;
  params: Record<string, unknown>;
  providerConfig: Record<string, unknown>;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Profile {
  id: string;
  name: string;
  messageStyle: MessageStyleConfig;
  aiConfigs: AiConfig[];
  activeAiConfigId: string;
  selectedModelId: string | null;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ProfileMeta {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

// Request types
export interface CreateProfileRequest {
  name: string;
  messageStyle?: MessageStyleConfig; // If not provided, uses defaults
  isDefault?: boolean;
}

export interface UpdateProfileRequest {
  name?: string;
  messageStyle?: MessageStyleConfig;
  activeAiConfigId?: string;
  selectedModelId?: string;
}
