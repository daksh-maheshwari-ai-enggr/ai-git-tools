/**
 * Base fetch-based provider helper.
 * All providers that speak OpenAI-compatible JSON API can reuse this.
 * No heavy SDK dependencies — we use native fetch + AbortController.
 */

import type { GenerateRequest, GenerateResponse, LLMProvider } from '../types/index.js';

export interface FetchProviderOptions {
  baseUrl: string;
  apiKey?: string;
  model: string;
  /** Request timeout in ms */
  timeoutMs?: number;
}

export function createFetchProvider(options: FetchProviderOptions): LLMProvider {
  const { baseUrl, apiKey, model, timeoutMs = 120_000 } = options;

  return {
    id: 'openai-compatible',
    async generate(request: GenerateRequest): Promise<GenerateResponse> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), request.timeoutMs ?? timeoutMs);
      // Wire up external signal if provided
      if (request.signal) {
        if (request.signal.aborted) throw new Error('Request already aborted');
        request.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      try {
        const messages: Array<{ role: string; content: string }> = [];
        if (request.systemPrompt) messages.push({ role: 'system', content: request.systemPrompt });
        messages.push({ role: 'user', content: request.prompt });

        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: request.model ?? model,
            messages,
            temperature: request.temperature ?? 0.3,
            max_tokens: request.maxTokens ?? 2048,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`Provider request failed (${res.status}): ${body}`);
        }

        const json = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          model?: string;
          usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        };

        const text = json.choices?.[0]?.message?.content ?? '';
        return {
          text,
          model: json.model ?? model,
          id: 'openai-compatible',
          usage: json.usage
            ? {
                promptTokens: json.usage.prompt_tokens ?? 0,
                completionTokens: json.usage.completion_tokens ?? 0,
                totalTokens: json.usage.total_tokens ?? 0,
              }
            : undefined,
        };
      } finally {
        clearTimeout(timer);
      }
    },

    async isAvailable(): Promise<boolean> {
      try {
        const res = await fetch(`${baseUrl}/models`, {
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        });
        return res.ok;
      } catch {
        return false;
      }
    },
  };
}