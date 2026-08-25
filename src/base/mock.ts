import type { BaseModel, GenerateOptions } from './types.js';

/**
 * A deterministic base for tests and CI: no network, no API key, and the same
 * output for the same prompt on every run. Construct it with a response function
 * so a bench can define a base that *fails* in a known way. A base that never
 * fails leaves an organ nothing to repair, so a demonstrable delta needs a base
 * that fails on part of the set (see docs/method.md).
 */
export class MockBase implements BaseModel {
  readonly id: string;
  private readonly respond: (prompt: string, opts?: GenerateOptions) => string;

  constructor(
    respond: (prompt: string, opts?: GenerateOptions) => string,
    id = 'mock',
  ) {
    this.id = id;
    this.respond = respond;
  }

  async generate(prompt: string, opts?: GenerateOptions): Promise<string> {
    return this.respond(prompt, opts);
  }
}
