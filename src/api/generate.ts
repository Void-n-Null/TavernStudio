/**
 * AI Generation API
 * 
 * Client-side API for streaming AI generation using Server-Sent Events.
 */

import { API_BASE } from './base';
import type { ModelMessage } from 'ai';

/**
 * OpenRouter-specific provider routing configuration.
 * Passed to the OpenRouter API via providerOptions.openrouter.provider
 */
export interface OpenRouterProviderRouting {
  /** Provider slugs to try in order (e.g., ["anthropic", "together"]) */
  order?: string[];
  /** Provider slugs to exclude from routing */
  ignore?: string[];
  /** Exclusive provider list - only use these providers */
  allow?: string[];
  /** Enable/disable automatic fallback to other providers (default: true) */
  allow_fallbacks?: boolean;
  /** Only use providers that support all parameters in request (default: false) */
  require_parameters?: boolean;
  /** Allowed quantization levels (e.g., ["fp16", "int8"]) */
  quantizations?: string[];
}

export interface GenerateRequest {
  providerId: string;
  modelId: string;
  /**
   * Optional "pricing identity" for the request.
   * Use this when the provider-specific model ID differs from the OpenRouter slug
   * (e.g. provider modelId: "gpt-4o-mini" vs pricingModelId: "openai/gpt-4o-mini").
   */
  pricingModelId?: string;
  messages: ModelMessage[];
  params?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    stopSequences?: string[];
  };
  /**
   * OpenRouter-specific configuration for provider routing.
   * Only used when providerId is 'openrouter'.
   */
  openRouterConfig?: {
    provider?: OpenRouterProviderRouting;
  };
}

export interface GenerateUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface StreamCallbacks {
  /** Called for each text chunk received */
  onDelta: (text: string) => void;
  /** Called when generation completes successfully */
  onDone?: (result: { usage: GenerateUsage; latencyMs: number }) => void;
  /** Called on error */
  onError?: (error: Error) => void;
}

/**
 * Stream AI generation using Server-Sent Events.
 * 
 * @param request - The generation request
 * @param callbacks - Callbacks for streaming events
 * @param signal - Optional AbortSignal to cancel the request
 * @returns Promise that resolves when streaming is complete
 * 
 * @example
 * ```ts
 * await streamGenerate(
 *   {
 *     providerId: 'openrouter',
 *     modelId: 'openai/gpt-4o-mini',
 *     messages: [{ role: 'user', content: 'Hello!' }],
 *   },
 *   {
 *     onDelta: (text) => console.log('Chunk:', text),
 *     onDone: (result) => console.log('Done:', result),
 *     onError: (err) => console.error('Error:', err),
 *   }
 * );
 * ```
 */
export async function streamGenerate(
  request: GenerateRequest,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${API_BASE}/ai/generate/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Generation request failed');
  }

  if (!response.body) {
    throw new Error('No response body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Parse SSE events from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      let currentEvent = '';
      let currentData = '';
      
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7);
        } else if (line.startsWith('data: ')) {
          currentData = line.slice(6);
          
          // Process the event
          if (currentEvent && currentData) {
            try {
              const parsed = JSON.parse(currentData);
              
              switch (currentEvent) {
                case 'delta':
                  if (parsed.text) {
                    callbacks.onDelta(parsed.text);
                  }
                  break;
                  
                case 'done':
                  callbacks.onDone?.({
                    usage: parsed.usage,
                    latencyMs: parsed.latencyMs,
                  });
                  break;
                  
                case 'error':
                  const error = new Error(parsed.error || 'Generation failed');
                  callbacks.onError?.(error);
                  throw error;
              }
            } catch (e) {
              // Ignore parse errors for malformed data
              if (e instanceof Error && e.message !== 'Generation failed') {
                console.warn('[generate] Failed to parse SSE data:', currentData, e);
              } else {
                throw e;
              }
            }
          }
          
          // Reset for next event
          currentEvent = '';
          currentData = '';
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Non-streaming generation (for simpler use cases).
 * Returns the full generated text.
 */
export async function generate(
  request: GenerateRequest,
  signal?: AbortSignal
): Promise<{ text: string; usage: GenerateUsage; latencyMs: number }> {
  let fullText = '';
  let usage: GenerateUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
  let latencyMs = 0;
  let error: Error | null = null;

  await streamGenerate(
    request,
    {
      onDelta: (text) => {
        fullText += text;
      },
      onDone: (r) => {
        usage = r.usage;
        latencyMs = r.latencyMs;
      },
      onError: (e) => {
        error = e;
      },
    },
    signal
  );

  if (error) throw error;
  
  return {
    text: fullText,
    usage,
    latencyMs,
  };
}

