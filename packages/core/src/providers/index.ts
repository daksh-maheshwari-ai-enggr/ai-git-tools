/**
 * LLM Provider abstraction.
 * Every provider backend implements the LLMProvider interface.
 * The core package never imports a specific provider directly —
 * the registry resolves them at runtime, so swapping backends is a no-op
 * for the rest of the codebase.
 */

import type {
  GenerateRequest,
  GenerateResponse,
  LLMProvider,
  ProviderConfig,
  ProviderId,
} from '../types/index.js';

export { type LLMProvider, type ProviderConfig, type ProviderId };

/** Registry of all known providers with their configs */
export const PROVIDER_CONFIGS: Record<ProviderId, ProviderConfig> = {
  openai: {
    id: 'openai',
    label: 'OpenAI',
    defaultModel: 'gpt-4o',
    apiKeyEnv: 'OPENAI_API_KEY',
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    defaultModel: 'claude-3-5-sonnet-20241022',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
  },
  google: {
    id: 'google',
    label: 'Google',
    defaultModel: 'gemini-1.5-pro',
    apiKeyEnv: 'GOOGLE_API_KEY',
  },
  ollama: {
    id: 'ollama',
    label: 'Ollama (local)',
    defaultModel: 'llama3.1',
    baseUrl: 'http://localhost:11434/v1',
  },
  'openai-compatible': {
    id: 'openai-compatible',
    label: 'OpenAI-compatible endpoint',
    defaultModel: 'gpt-4o',
    apiKeyEnv: 'OPENAI_COMPATIBLE_API_KEY',
  },
};

export function getProviderConfig(id: ProviderId): ProviderConfig {
  return PROVIDER_CONFIGS[id];
}

/** Resolve which provider to use from env / config */
export function resolveProvider(
  providerId?: ProviderId,
  model?: string,
  baseUrl?: string,
): { providerId: ProviderId; model: string; apiKey?: string } {
  const id = providerId ?? (process.env['GH_AI_PROVIDER'] as ProviderId) ?? 'openai';
  const config = PROVIDER_CONFIGS[id];
  const resolvedModel = model ?? config.defaultModel;
  const apiKey = config.apiKeyEnv ? process.env[config.apiKeyEnv] : undefined;
  return { providerId: id, model: resolvedModel, apiKey };
}

/** Factory: create a provider instance by id. Lazy — avoids importing heavy SDKs until needed. */
export async function createProvider(
  providerId: ProviderId,
  model: string,
  apiKey?: string,
  baseUrl?: string,
): Promise<LLMProvider> {
  switch (providerId) {
    case 'openai':
      return (await import('./openai.js')).createOpenAIProvider(model, apiKey, baseUrl);
    case 'anthropic':
      return (await import('./anthropic.js')).createAnthropicProvider(model, apiKey);
    case 'google':
      return (await import('./google.js')).createGoogleProvider(model, apiKey);
    case 'ollama':
      return (await import('./ollama.js')).createOllamaProvider(model, baseUrl);
    case 'openai-compatible':
      return (await import('./openai-compatible.js')).createOpenAICompatibleProvider(model, apiKey, baseUrl);
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}

/** Default provider used when none is configured. */
export const DEFAULT_PROVIDER: ProviderId = 'openai';