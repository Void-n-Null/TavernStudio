export type ProviderHint = 'openai' | 'openrouter' | 'anthropic' | 'google' | 'unknown';

export type ContextInference = {
  contextTokens: number;
  confidence: 'high' | 'medium' | 'low';
  source: 'heuristic';
  reason: string;
};

function norm(s: string | undefined | null): string {
  return (s || '').trim().toLowerCase();
}

/**
 * Best-effort inference of a model's context window size from its model ID.
 *
 * Notes:
 * - This is inherently fuzzy (OpenRouter models vary, providers change, variants exist).
 * - We treat the result as a UI hint only; users should be able to override.
 */
export function inferContextWindowTokens(opts: { providerId?: string; modelId?: string }): ContextInference | null {
  const provider = norm(opts.providerId);
  const model = norm(opts.modelId);
  if (!model && !provider) return null;

  // OpenRouter model IDs often look like "openai/gpt-4o-mini" or "anthropic/claude-3.5-sonnet".
  const m = model.includes('/') ? model.split('/').pop() ?? model : model;

  // --- OpenAI (common) ---
  // GPT-4.1 family: 1M context (per OpenAI announcement). Variants exist; keep as medium confidence.
  if (m.startsWith('gpt-4.1') || m.startsWith('gpt-4-1')) {
    return {
      contextTokens: 1_000_000,
      confidence: 'medium',
      source: 'heuristic',
      reason: 'Model ID looks like GPT-4.1 (often 1M context).',
    };
  }

  // GPT-4o family commonly 128k.
  if (m.startsWith('gpt-4o')) {
    return {
      contextTokens: 128_000,
      confidence: 'medium',
      source: 'heuristic',
      reason: 'Model ID looks like GPT-4o (commonly 128k context).',
    };
  }

  // --- Anthropic / Claude ---
  // Claude 3.5 Sonnet and many Claude 3.* models commonly 200k. Claude Sonnet 4/4.5 support 1M in beta.
  if (m.includes('claude') || provider === 'anthropic') {
    if (m.includes('sonnet-4') || m.includes('sonnet 4') || m.includes('sonnet-4.5') || m.includes('sonnet 4.5')) {
      return {
        contextTokens: 200_000,
        confidence: 'low',
        source: 'heuristic',
        reason: 'Claude Sonnet 4+ often 200k standard; some orgs can enable 1M beta.',
      };
    }

    if (m.includes('3-5') || m.includes('3.5') || m.includes('3-7') || m.includes('3.7') || m.includes('3')) {
      return {
        contextTokens: 200_000,
        confidence: 'medium',
        source: 'heuristic',
        reason: 'Claude model ID (often 200k context).',
      };
    }
  }

  // --- Google / Gemini ---
  if (m.includes('gemini') || provider === 'google') {
    if (m.includes('1.5') || m.includes('2.5') || m.includes('3')) {
      return {
        contextTokens: 1_000_000,
        confidence: 'low',
        source: 'heuristic',
        reason: 'Gemini family often supports very large context (commonly 1M+ on some tiers).',
      };
    }
  }

  return null;
}


