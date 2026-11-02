/**
 * OpenRouter provider — unified API for 100+ models.
 * Free tier includes several models.
 * Models: openrouter/auto (routes to best free), meta-llama/llama-3.1-8b-instruct:free, google/gemma-2-9b-it:free
 */

import { createFetchProvider } from './fetch-base.js';
import type { LLMProvider } from '../types/index.js';

export function createOpenRouterProvider(model: string, apiKey?: string): LLMProvider {
  const provider = createFetchProvider({
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKey: apiKey ?? process.env['OPENROUTER_API_KEY'],
    model,
  });

  return {
    ...provider,
    id: 'openrouter',
    async generate(request) {
      // OpenRouter supports additional headers for routing
      const res = await (provider as any).generate?.(request);
      return res;
    },
  };
}