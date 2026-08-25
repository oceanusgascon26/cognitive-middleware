import type { BaseModel, GenerateOptions, Organ } from '../../base/types.js';
import { combineConstraints, deriveConstraintCheckers } from './checkers.js';
import { runConstraintRepair, type RepairConfig } from './repair.js';

/**
 * The instruction-following organ. Wraps a base so that, on a format-constrained
 * prompt, it generates, checks against the SAME predicate the score uses, and repairs
 * on a violation up to maxRetries. On a prompt with no machine-checkable constraint it
 * passes through. When `enabled` is false it is byte-identical to the base.
 */
export class InstructionFollowingOrgan implements Organ {
  readonly name = 'instruction-following';
  enabled: boolean;
  private readonly maxRetries: number;

  constructor(config: Partial<RepairConfig> = {}) {
    this.enabled = config.enabled ?? true;
    this.maxRetries = config.maxRetries ?? 3;
  }

  wrap(base: BaseModel): BaseModel {
    const organ = this;
    return {
      id: base.id,
      async generate(prompt: string, opts?: GenerateOptions): Promise<string> {
        // Off, or nothing checkable in this prompt: pass through unchanged (byte-identical).
        const constraints = organ.enabled ? deriveConstraintCheckers(prompt) : [];
        const check = combineConstraints(constraints);
        if (!organ.enabled || check === null) {
          return base.generate(prompt, opts);
        }
        const res = await runConstraintRepair({
          task: { prompt },
          check,
          generate: (p) => base.generate(p, opts),
          config: { enabled: true, maxRetries: organ.maxRetries },
        });
        return res.text;
      },
    };
  }
}

/** Score a generation against the constraints implied by its own prompt: the SAME
 *  predicate the organ repairs against. Prompts with no machine-checkable constraint
 *  score as passing (there is nothing to violate). */
export function scoreInstructionFollowing(prompt: string, output: string): boolean {
  const check = combineConstraints(deriveConstraintCheckers(prompt));
  if (check === null) return true;
  return check(output).ok;
}
