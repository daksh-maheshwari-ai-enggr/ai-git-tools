/**
 * Groq provider — uses the Groq API (OpenAI-compatible).
 * Free tier available with generous limits.
 * Models: llama-3.1-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768
 */

import { createFetchProvider } from './fetch-base.js';
import type { LLMProvider } from '../types/index.js';

export function createGroqProvider(model: string, apiKey?: string): LLMProvider {
  const provider = createFetchProvider({
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKey: apiKey ?? process.env['GROQ_API_KEY'],
    model,
  });

  return {
    ...provider,
    id: 'groq',
  };
}