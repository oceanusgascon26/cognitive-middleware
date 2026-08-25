import type { BaseModel } from './types.js';
import { anthropicBase } from './anthropic.js';
import { openAICompatBase } from './openai-compat.js';

/**
 * Build a base from a "provider:model" spec.
 * Supported providers: "anthropic" (needs ANTHROPIC_API_KEY), "openai-compat"
 * (uses OPENAI_BASE_URL + OPENAI_API_KEY; points at hosted or local servers).
 */
export function makeBase(spec: string): BaseModel {
  const idx = spec.indexOf(':');
  const provider = idx === -1 ? spec : spec.slice(0, idx);
  const model = idx === -1 ? '' : spec.slice(idx + 1);
  switch (provider) {
    case 'anthropic':
      return anthropicBase({ model });
    case 'openai-compat':
      return openAICompatBase({ model });
    default:
      throw new Error(`unknown base provider "${provider}" in "${spec}" (supported: anthropic, openai-compat)`);
  }
}

/** Build a base from the BASE_MODEL env spec, with a guidance error if unset. */
export function makeBaseFromEnv(): BaseModel {
  const spec = process.env.BASE_MODEL;
  if (!spec) {
    throw new Error(
      'set BASE_MODEL, e.g. BASE_MODEL="anthropic:claude-haiku-4-5" (needs ANTHROPIC_API_KEY), ' +
        'or BASE_MODEL="openai-compat:<model>" with OPENAI_BASE_URL pointing at a local or hosted server',
    );
  }
  return makeBase(spec);
}
