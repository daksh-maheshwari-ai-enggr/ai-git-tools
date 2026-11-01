/**
 * Anthropic provider — uses the Anthropic Messages API.
 * Different from OpenAI: system prompt is a top-level field, and the
 * messages array uses 'assistant'/'user' roles only.
 */

import type { GenerateRequest, GenerateResponse, LLMProvider } from '../types/index.js';

export function createAnthropicProvider(model: string, apiKey?: string): LLMProvider {
  const key = apiKey ?? process.env['ANTHROPIC_API_KEY'];
  const baseUrl = 'https://api.anthropic.com/v1';

  return {
    id: 'anthropic',
    async generate(request: GenerateRequest): Promise<GenerateResponse> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), request.timeoutMs ?? 120_000);
      if (request.signal) {
        if (request.signal.aborted) throw new Error('Request already aborted');
        request.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      try {
        const res = await fetch(`${baseUrl}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key ?? '',
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: request.model ?? model,
            max_tokens: request.maxTokens ?? 2048,
            temperature: request.temperature ?? 0.3,
            system: request.systemPrompt ?? '',
            messages: [{ role: 'user', content: request.prompt }],
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`Anthropic request failed (${res.status}): ${body}`);
        }

        const json = (await res.json()) as {
          content?: Array<{ text?: string }>;
          model?: string;
          usage?: { input_tokens?: number; output_tokens?: number };
        };

        const text = json.content?.[0]?.text ?? '';
        return {
          text,
          model: json.model ?? model,
          id: 'anthropic',
          usage: json.usage
            ? {
                promptTokens: json.usage.input_tokens ?? 0,
                completionTokens: json.usage.output_tokens ?? 0,
                totalTokens: (json.usage.input_tokens ?? 0) + (json.usage.output_tokens ?? 0),
              }
            : undefined,
        };
      } finally {
        clearTimeout(timer);
      }
    },

    async isAvailable(): Promise<boolean> {
      return !!key;
    },
  };
}