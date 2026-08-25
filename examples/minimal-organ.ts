/**
 * A minimal organ. It uppercases the base's output when enabled, which is not useful;
 * it exists to show the contract in the smallest possible form. Note the byte-identical
 * rule: with `enabled` false, wrap(base).generate(...) returns exactly what
 * base.generate(...) returns.
 *
 * Run: tsx examples/minimal-organ.ts
 */
import { pathToFileURL } from 'node:url';
import type { BaseModel, GenerateOptions, Organ } from '../src/base/types.js';
import { MockBase } from '../src/base/mock.js';

export class ShoutOrgan implements Organ {
  readonly name = 'shout';
  enabled: boolean;

  constructor(config: { enabled?: boolean } = {}) {
    this.enabled = config.enabled ?? true;
  }

  wrap(base: BaseModel): BaseModel {
    const organ = this;
    return {
      id: base.id,
      async generate(prompt: string, opts?: GenerateOptions): Promise<string> {
        const out = await base.generate(prompt, opts);
        return organ.enabled ? out.toUpperCase() : out; // off => byte-identical
      },
    };
  }
}

async function demo(): Promise<void> {
  const base = new MockBase((p) => `you said: ${p}`);
  const off = new ShoutOrgan({ enabled: false }).wrap(base);
  const on = new ShoutOrgan({ enabled: true }).wrap(base);
  const prompt = 'hello';
  console.log('base :', await base.generate(prompt));
  console.log('off  :', await off.generate(prompt), '(byte-identical to base)');
  console.log('on   :', await on.generate(prompt));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  demo().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
