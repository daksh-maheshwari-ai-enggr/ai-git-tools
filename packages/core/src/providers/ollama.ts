/**
 * Ollama provider — local models via the Ollama API.
 * Ollama exposes an OpenAI-compatible endpoint, so we reuse the fetch base.
 * Default base URL is http://localhost:11434/v1.
 */

import { createFetchProvider } from './fetch-base.js';
import type { LLMProvider } from '../types/index.js';

export function createOllamaProvider(model: string, baseUrl?: string): LLMProvider {
  const provider = createFetchProvider({
    baseUrl: baseUrl ?? 'http://localhost:11434/v1',
    model,
  });

  return {
    ...provider,
    id: 'ollama',
  };
}