import type { BaseModel, GenerateOptions } from './types.js';

export interface AnthropicOptions {
  model: string;
  apiKey?: string;
  baseUrl?: string;
  version?: string;
  defaultMaxTokens?: number;
}

/**
 * A base backed by the Anthropic Messages API, over fetch (no SDK dependency).
 * Reads ANTHROPIC_API_KEY from the environment unless an apiKey is passed.
 */
export function anthropicBase(opts: AnthropicOptions): BaseModel {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  const baseUrl = (opts.baseUrl ?? 'https://api.anthropic.com').replace(/\/$/, '');
  const version = opts.version ?? '2023-06-01';
  if (!apiKey) throw new Error('anthropicBase: no API key (set ANTHROPIC_API_KEY or pass apiKey)');
  return {
    id: `anthropic:${opts.model}`,
    async generate(prompt: string, gopts?: GenerateOptions): Promise<string> {
      const body: Record<string, unknown> = {
        model: opts.model,
        max_tokens: gopts?.maxTokens ?? opts.defaultMaxTokens ?? 1024,
        messages: [{ role: 'user', content: prompt }],
      };
      if (gopts?.system) body.system = gopts.system;
      if (gopts?.temperature !== undefined) body.temperature = gopts.temperature;
      if (gopts?.stop && gopts.stop.length) body.stop_sequences = gopts.stop;
      const res = await fetch(`${baseUrl}/v1/messages`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': version },
        body: JSON.stringify(body),
        signal: gopts?.signal,
      });
      if (!res.ok) throw new Error(`anthropic ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
      return (json.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('');
    },
  };
}
