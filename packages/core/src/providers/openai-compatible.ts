/**
 * Generic OpenAI-compatible endpoint (e.g. LM Studio, vLLM, local LLM servers).
 * Reuses the fetch-based base.
 */

import { createFetchProvider } from './fetch-base.js';
import type { LLMProvider } from '../types/index.js';

export function createOpenAICompatibleProvider(
  model: string,
  apiKey?: string,
  baseUrl?: string,
): LLMProvider {
  if (!baseUrl) {
    throw new Error('OpenAI-compatible provider requires a baseUrl');
  }

  const provider = createFetchProvider({
    baseUrl,
    apiKey: apiKey ?? process.env['OPENAI_COMPATIBLE_API_KEY'],
    model,
  });

  return {
    ...provider,
    id: 'openai-compatible',
  };
}