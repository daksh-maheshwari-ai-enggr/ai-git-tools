/**
 * Google (Gemini) provider — uses the Google Generative AI REST API.
 * Uses the generateContent endpoint with a different request shape.
 */

import type { GenerateRequest, GenerateResponse, LLMProvider } from '../types/index.js';

export function createGoogleProvider(model: string, apiKey?: string): LLMProvider {
  const key = apiKey ?? process.env['GOOGLE_API_KEY'];

  return {
    id: 'google',
    async generate(request: GenerateRequest): Promise<GenerateResponse> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), request.timeoutMs ?? 120_000);
      if (request.signal) {
        if (request.signal.aborted) throw new Error('Request already aborted');
        request.signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      try {
        const contents = [
          ...(request.systemPrompt
            ? [{ role: 'user', parts: [{ text: request.systemPrompt }] }]
            : []),
          { role: 'user', parts: [{ text: request.prompt }] },
        ];

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${request.model ?? model}:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              generationConfig: {
                temperature: request.temperature ?? 0.3,
                maxOutputTokens: request.maxTokens ?? 2048,
              },
            }),
            signal: controller.signal,
          },
        );

        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new Error(`Google request failed (${res.status}): ${body}`);
        }

        const json = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          modelVersion?: string;
          usageMetadata?: {
            promptTokenCount?: number;
            candidatesTokenCount?: number;
            totalTokenCount?: number;
          };
        };

        const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        return {
          text,
          model: json.modelVersion ?? model,
          id: 'google',
          usage: json.usageMetadata
            ? {
                promptTokens: json.usageMetadata.promptTokenCount ?? 0,
                completionTokens: json.usageMetadata.candidatesTokenCount ?? 0,
                totalTokens: json.usageMetadata.totalTokenCount ?? 0,
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