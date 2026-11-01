/**
 * OpenAI provider — uses the OpenAI-compatible chat completions API.
 * Reuses the fetch-based base; OpenAI is OpenAI-compatible by definition.
 */

import { createFetchProvider } from './fetch-base.js';
import type { LLMProvider } from '../types/index.js';

export function createOpenAIProvider(
  model: string,
  apiKey?: string,
  baseUrl?: string,
): LLMProvider {
  const provider = createFetchProvider({
    baseUrl: baseUrl ?? 'https://api.openai.com/v1',
    apiKey: apiKey ?? process.env['OPENAI_API_KEY'],
    model,
  });

  // Override the id to reflect the actual provider
  return {
    ...provider,
    id: 'openai',
  };
}