/**
 * FreeLLMAPI provider — a fallback chain across multiple free LLM providers.
 * Tries providers in order until one succeeds.
 * Order: Groq (fastest) → OpenRouter (most models) → Ollama (local) → Google AI Studio
 */

import type { GenerateRequest, GenerateResponse, LLMProvider, ProviderId } from '../types/index.js';
import { createGroqProvider } from './groq.js';
import { createOpenRouterProvider } from './openrouter.js';
import { createOllamaProvider } from './ollama.js';
import { createGoogleProvider } from './google.js';

export interface FallbackProviderConfig {
  /** Ordered list of provider IDs to try */
  chain?: ProviderId[];
  /** Per-provider model overrides */
  models?: Partial<Record<ProviderId, string>>;
  /** Per-provider API keys (optional, falls back to env) */
  apiKeys?: Partial<Record<ProviderId, string>>;
}

const DEFAULT_CHAIN: ProviderId[] = ['groq', 'openrouter', 'ollama', 'google'];
const DEFAULT_MODELS: Record<ProviderId, string> = {
  groq: 'llama-3.1-70b-versatile',
  openrouter: 'meta-llama/llama-3.1-8b-instruct:free',
  ollama: 'llama3.1',
  google: 'gemini-1.5-flash',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-haiku-20480307',
  'openai-compatible': 'gpt-4o-mini',
};

export function createFreeLLMAPIProvider(config: FallbackProviderConfig = {}): LLMProvider {
  const chain = config.chain ?? DEFAULT_CHAIN;
  const models = { ...DEFAULT_MODELS, ...config.models };
  const apiKeys = config.apiKeys ?? {};

  const providers = chain.map((id) => {
    const model = models[id] ?? DEFAULT_MODELS[id];
    const key = apiKeys[id];

    switch (id) {
      case 'groq':
        return createGroqProvider(model, key);
      case 'openrouter':
        return createOpenRouterProvider(model, key);
      case 'ollama':
        return createOllamaProvider(model);
      case 'google':
        return createGoogleProvider(model, key);
      default:
        return null;
    }
  }).filter(Boolean) as LLMProvider[];

  if (providers.length === 0) {
    throw new Error('FreeLLMAPI: No valid providers in fallback chain');
  }

  return {
    id: 'freellmapi',
    async generate(request: GenerateRequest): Promise<GenerateResponse> {
      let lastError: Error | undefined;

      for (let i = 0; i < providers.length; i++) {
        const provider = providers[i];
        try {
          const result = await provider.generate(request);
          // Tag the response with which provider actually succeeded
          return {
            ...result,
            provider: provider.id,
            model: result.model,
          };
        } catch (err) {
          lastError = err as Error;
          // Log and continue to next provider
          console.debug(`[freellmapi] Provider ${provider.id} failed:`, err);
          continue;
        }
      }

      // All providers failed
      throw new Error(
        `FreeLLMAPI: All ${providers.length} providers failed. Last error: ${lastError?.message}`,
      );
    },

    async isAvailable(): Promise<boolean> {
      // Available if at least one provider in chain is available
      for (const provider of providers) {
        if (await provider.isAvailable()) return true;
      }
      return false;
    },
  };
}

/** Quick check: which free providers have valid API keys configured */
export function getAvailableFreeProviders(): ProviderId[] {
  const available: ProviderId[] = [];
  if (process.env['GROQ_API_KEY']) available.push('groq');
  if (process.env['OPENROUTER_API_KEY']) available.push('openrouter');
  if (process.env['GOOGLE_API_KEY']) available.push('google');
  // Ollama doesn't need an API key, just a running server
  available.push('ollama');
  return available;
}