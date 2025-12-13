import { getProviderConfig } from '../config/store';
import { getProviderSecret } from '../secrets/store';
import { getProviderOrThrow } from '../registry';
import { getProviderConnection, markDisconnected, upsertProviderConnection } from './store';

import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';

export type ConnectedClient =
  | { providerId: 'openrouter'; client: ReturnType<typeof createOpenRouter> }
  | { providerId: 'openai'; client: ReturnType<typeof createOpenAI> }
  | { providerId: 'anthropic'; client: ReturnType<typeof createAnthropic> };

const clientCache = new Map<string, ConnectedClient>();

function classifyAuthError(status: number | null): 'error_auth' | 'error_other' {
  if (status === 401 || status === 403) return 'error_auth';
  return 'error_other';
}

async function validateWithModelsEndpoint(
  url: string,
  headers: Record<string, string>
): Promise<{ ok: true } | { ok: false; status: number | null; body: string }> {
  try {
    const res = await fetch(url, { method: 'GET', headers });
    if (res.ok) return { ok: true };
    const text = await res.text().catch(() => '');
    return { ok: false, status: res.status, body: text };
  } catch (e) {
    return { ok: false, status: null, body: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Connect (validate credentials) and cache a provider client instance.
 * This does NOT start any model streams; it just confirms auth works.
 */
export async function connectProvider(providerId: string, authStrategyId: string): Promise<void> {
  const def = getProviderOrThrow(providerId);
  const strategy = def.authStrategies.find((s) => s.id === authStrategyId);
  if (!strategy) throw new Error(`Unknown auth strategy: ${authStrategyId}`);

  // Ensure required secrets exist.
  const apiKey = getProviderSecret(providerId, authStrategyId, 'apiKey');
  if (!apiKey) throw new Error('Missing apiKey secret for this strategy');

  // Parse config to get base URLs / headers if needed.
  const rawConfig = getProviderConfig(providerId) ?? {};
  const parsedConfig = def.configSchema.safeParse(rawConfig);
  const config = parsedConfig.success ? parsedConfig.data : {};

  // Validate via cheap list-models endpoints.
  if (providerId === 'openrouter') {
    const r = await validateWithModelsEndpoint('https://openrouter.ai/api/v1/models', {
      Authorization: `Bearer ${apiKey}`,
      ...(typeof (config as any).appName === 'string' ? { 'X-Title': (config as any).appName } : {}),
      ...(typeof (config as any).appUrl === 'string' ? { 'HTTP-Referer': (config as any).appUrl } : {}),
    });
    if (!r.ok) {
      const status = classifyAuthError(r.status);
      upsertProviderConnection(providerId, {
        auth_strategy_id: authStrategyId,
        status,
        last_error: r.body?.slice(0, 500) || 'Validation failed',
        last_validated_at: null,
      });
      throw new Error(`OpenRouter validation failed (${r.status ?? 'network'}): ${r.body || ''}`.trim());
    }

    const client = createOpenRouter({
      apiKey,
      headers: {
        ...(typeof (config as any).appName === 'string' ? { 'X-Title': (config as any).appName } : null),
        ...(typeof (config as any).appUrl === 'string' ? { 'HTTP-Referer': (config as any).appUrl } : null),
      },
    });
    clientCache.set(providerId, { providerId: 'openrouter', client });
    upsertProviderConnection(providerId, {
      auth_strategy_id: authStrategyId,
      status: 'connected',
      last_error: null,
      last_validated_at: Date.now(),
    });
    return;
  }

  if (providerId === 'openai') {
    const baseURL = typeof (config as any).baseURL === 'string' ? (config as any).baseURL : undefined;
    const r = await validateWithModelsEndpoint(`${baseURL ?? 'https://api.openai.com/v1'}/models`, {
      Authorization: `Bearer ${apiKey}`,
      ...(typeof (config as any).organization === 'string' ? { 'OpenAI-Organization': (config as any).organization } : {}),
      ...(typeof (config as any).project === 'string' ? { 'OpenAI-Project': (config as any).project } : {}),
    });
    if (!r.ok) {
      const status = classifyAuthError(r.status);
      upsertProviderConnection(providerId, {
        auth_strategy_id: authStrategyId,
        status,
        last_error: r.body?.slice(0, 500) || 'Validation failed',
        last_validated_at: null,
      });
      throw new Error(`OpenAI validation failed (${r.status ?? 'network'}): ${r.body || ''}`.trim());
    }

    const client = createOpenAI({
      apiKey,
      baseURL,
      headers: {
        ...(typeof (config as any).organization === 'string' ? { 'OpenAI-Organization': (config as any).organization } : null),
        ...(typeof (config as any).project === 'string' ? { 'OpenAI-Project': (config as any).project } : null),
      },
    });
    clientCache.set(providerId, { providerId: 'openai', client });
    upsertProviderConnection(providerId, {
      auth_strategy_id: authStrategyId,
      status: 'connected',
      last_error: null,
      last_validated_at: Date.now(),
    });
    return;
  }

  if (providerId === 'anthropic') {
    const baseURL = typeof (config as any).baseURL === 'string' ? (config as any).baseURL : 'https://api.anthropic.com/v1';
    const r = await validateWithModelsEndpoint(`${baseURL}/models`, {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    });
    if (!r.ok) {
      const status = classifyAuthError(r.status);
      upsertProviderConnection(providerId, {
        auth_strategy_id: authStrategyId,
        status,
        last_error: r.body?.slice(0, 500) || 'Validation failed',
        last_validated_at: null,
      });
      throw new Error(`Anthropic validation failed (${r.status ?? 'network'}): ${r.body || ''}`.trim());
    }

    const client = createAnthropic({
      apiKey,
      baseURL,
      headers: {
        'anthropic-version': '2023-06-01',
      },
    });
    clientCache.set(providerId, { providerId: 'anthropic', client });
    upsertProviderConnection(providerId, {
      auth_strategy_id: authStrategyId,
      status: 'connected',
      last_error: null,
      last_validated_at: Date.now(),
    });
    return;
  }

  throw new Error(`connectProvider not implemented for ${providerId}`);
}

export function disconnectProvider(providerId: string, reason: string | null = null): void {
  clientCache.delete(providerId);
  markDisconnected(providerId, reason);
}

export function getConnectedClient(providerId: string): ConnectedClient | null {
  return clientCache.get(providerId) ?? null;
}

export function getConnectionStatus(providerId: string) {
  return getProviderConnection(providerId);
}




