/**
 * The base-model interface and the organ contract.
 *
 * A "base" is anything that maps a prompt to text. An "organ" wraps a base and
 * returns an augmented base. The kit measures the delta an organ adds, against a
 * base that actually fails. When the base does not fail on a task, the organ shows
 * no delta on that task — a property of the base, not a fault of the organ.
 */

export interface GenerateOptions {
  /** Optional system prompt / instruction context. */
  system?: string;
  /** Upper bound on generated tokens, if the base honors it. */
  maxTokens?: number;
  /** Sampling temperature, if the base honors it. */
  temperature?: number;
  /** Stop sequences, if the base honors them. */
  stop?: string[];
  /** Abort signal for cancellation and timeouts. */
  signal?: AbortSignal;
}

export interface BaseModel {
  /** Stable id used in reports, e.g. "mock", "anthropic:<model>", "openai-compat:<model>". */
  readonly id: string;
  /** Map a prompt to a completion. The only capability an organ may assume. */
  generate(prompt: string, opts?: GenerateOptions): Promise<string>;
}

/**
 * An organ wraps a base model and returns an augmented model.
 *
 * Contract:
 *  - `wrap(base)` returns a BaseModel with the same interface, so organs compose.
 *  - When `enabled` is false, `wrap(base).generate(...)` MUST be byte-identical to
 *    `base.generate(...)`: the same call, the same arguments, the same output. The
 *    kit asserts this invariant (see test/). An organ that changes behavior while
 *    off is a bug, not an organ.
 *  - An organ measured on a base that never fails shows no delta. That is a property
 *    of the base, not a failure of the organ (see docs/method.md).
 */
export interface Organ {
  readonly name: string;
  /** When false, wrap() must pass through unchanged (byte-identical to the base). */
  enabled: boolean;
  /** Return an augmented base model that wraps `base`. */
  wrap(base: BaseModel): BaseModel;
}

/** Outcome of scoring one item under one condition (base, or base+organ). */
export interface ItemResult {
  id: string;
  passed: boolean;
  /** Optional free-form detail for debugging (never scored). */
  note?: string;
}
