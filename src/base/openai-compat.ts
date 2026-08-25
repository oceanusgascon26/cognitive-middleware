import type { BaseModel, GenerateOptions } from './types.js';

export interface OpenAICompatOptions {
  model: string;
  apiKey?: string;
  /** e.g. https://api.openai.com/v1 or a local server at http://127.0.0.1:PORT/v1 */
  baseUrl?: string;
  defaultMaxTokens?: number;
}

/**
 * A base backed by any OpenAI-compatible chat-completions endpoint, over fetch.
 * Works with hosted OpenAI-compatible APIs and local servers. Reads OPENAI_API_KEY
 * and OPENAI_BASE_URL from the environment unless overridden.
 */
export function openAICompatBase(opts: OpenAICompatOptions): BaseModel {
  const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY ?? 'not-needed';
  const baseUrl = (opts.baseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  return {
    id: `openai-compat:${opts.model}`,
    async generate(prompt: string, gopts?: GenerateOptions): Promise<string> {
      const messages: Array<{ role: string; content: string }> = [];
      if (gopts?.system) messages.push({ role: 'system', content: gopts.system });
      messages.push({ role: 'user', content: prompt });
      const body: Record<string, unknown> = {
        model: opts.model,
        messages,
        max_tokens: gopts?.maxTokens ?? opts.defaultMaxTokens ?? 1024,
      };
      if (gopts?.temperature !== undefined) body.temperature = gopts.temperature;
      if (gopts?.stop && gopts.stop.length) body.stop = gopts.stop;
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: gopts?.signal,
      });
      if (!res.ok) throw new Error(`openai-compat ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return json.choices?.[0]?.message?.content ?? '';
    },
  };
}
