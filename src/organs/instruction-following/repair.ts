/**
 * The constraint self-check-and-repair loop (the reusable verify-and-revise seam).
 *
 * PURE CORE: this module has no I/O and no environment reads inside
 * runConstraintRepair() (env enters only through resolveRepairConfig(env)). The one
 * side effect it performs is awaiting an INJECTED model-call function, so tests drive
 * it with a mock (no network) and a bench binds it to a real base model.
 *
 * Why it works: an instruction-following failure is deterministic and machine-checkable,
 * so a check-and-repair loop targets exactly the scored predicate. Generate, run the
 * SAME checker the score uses, and on a failure re-prompt with the SPECIFIC violation,
 * up to R times. Measured on a weak base: 76.9% one-shot to 97.4% with repair.
 *
 * ADDITIVE + OFF BY DEFAULT: resolveRepairConfig defaults enabled=false, and a disabled
 * loop does EXACTLY one generate and returns it verbatim (no extra checker runs, no
 * repair calls). A caller that wires this behind a flag with the flag off is
 * byte-identical to a plain one-shot: same single model call, same returned text.
 */

import type { ConstraintCheck, ConstraintPredicate } from './checkers.js';

/** The injection seam: takes the fully composed prompt, returns the model's text. */
export type RepairModelFn = (prompt: string) => Promise<string>;

/** The task the loop repairs toward. `prompt` is the raw instruction. */
export interface RepairTask {
  id?: string;
  prompt: string;
}

export interface RepairConfig {
  /** Master switch. Defaults false. When false, one generate, returned verbatim. */
  enabled: boolean;
  /** Max repair retries after the first attempt. Default 3. */
  maxRetries: number;
}

export interface RepairInput {
  task: RepairTask;
  /** The machine-checkable constraint the output must satisfy. */
  check: ConstraintPredicate;
  /** Injected model-call fn (mock in tests; real base in a bench). */
  generate: RepairModelFn;
  /** Resolved thresholds. Pass resolveRepairConfig(env) or a literal. */
  config: RepairConfig;
  /** Suffix appended to the raw prompt on the FIRST attempt. */
  firstShotSuffix?: string;
  /** Repair-prompt builder (previous attempt + specific violation + rewrite directive). */
  buildRepairPrompt?: (taskPrompt: string, previous: string, violation: string) => string;
  /** OPTIONAL pre-generated first attempt. When provided, the loop SKIPS its own initial
   *  generate() and uses this as the first-shot text (the caller already produced a draft,
   *  so re-generating would double the cost). generate() is then only called for repairs. */
  firstText?: string;
}

export interface RepairResult {
  /** Final text after repair (=== firstText when off or when the first shot passed). */
  text: string;
  /** The one-shot text, always captured for a paired baseline vs repair comparison. */
  firstText: string;
  /** Final check verdict (the treatment outcome). */
  ok: boolean;
  /** First-shot check verdict (the baseline outcome). */
  firstOk: boolean;
  /** Repair attempts actually made (0 when off, or when the first shot passed). */
  retries: number;
  /** True iff at least one repair attempt ran. */
  didRepair: boolean;
}

/** The proven first-shot suffix. */
export const DEFAULT_FIRST_SHOT_SUFFIX = '\n\nOutput only the response, nothing else.';

/** The proven repair-prompt template: re-prompt with the previous attempt and the
 *  SPECIFIC violation so the base revises toward exactly the failed predicate. */
export function defaultRepairPrompt(taskPrompt: string, previous: string, violation: string): string {
  return (
    taskPrompt +
    '\n\nYour previous attempt was:\n"""\n' +
    previous +
    '\n"""\n\n' +
    `That attempt FAILED this requirement: ${violation}. ` +
    'Rewrite the response so it satisfies EVERY requirement exactly. Output only the corrected response, nothing else.'
  );
}

/** Only the literal strings 'true'/'false' (case-insensitive, trimmed) flip the value. */
function envBool(env: NodeJS.ProcessEnv, name: string, fallback: boolean): boolean {
  const raw = env[name];
  if (raw === undefined) return fallback;
  const v = String(raw).trim().toLowerCase();
  if (v === 'true') return true;
  if (v === 'false') return false;
  return fallback;
}

function envInt(env: NodeJS.ProcessEnv, name: string, fallback: number, min: number, max: number): number {
  const raw = Number(env[name]);
  if (!Number.isFinite(raw)) return fallback;
  return Math.round(Math.max(min, Math.min(max, raw)));
}

/** Resolve config from env; every knob defaults to off (enabled=false).
 *  REPAIR_ENABLED ('true' -> true, else false); REPAIR_MAX_RETRIES (3, [0, MAX]).
 *  Reads ONLY the passed env map (never process.env directly). */
export function resolveRepairConfig(env: NodeJS.ProcessEnv): RepairConfig {
  return {
    enabled: envBool(env, 'REPAIR_ENABLED', false),
    maxRetries: envInt(env, 'REPAIR_MAX_RETRIES', 3, 0, Number.MAX_SAFE_INTEGER),
  };
}

/** The loop. Pure aside from awaiting the INJECTED generate fn.
 *
 *  1. First attempt: generate(prompt + firstShotSuffix); run check -> firstOk.
 *  2. If OFF: return the first attempt verbatim, retries 0 (byte-identical to one-shot).
 *  3. If ON: while the check fails and retries remain, re-prompt with the specific
 *     violation, generate, re-check. Stop at the first pass or maxRetries.
 *
 *  Always returns BOTH firstOk (baseline) and ok (treatment), so a bench gets a paired
 *  comparison from a single sequence of calls (the first attempt is shared). */
export async function runConstraintRepair(input: RepairInput): Promise<RepairResult> {
  const { task, check, generate, config } = input;
  const firstSuffix = input.firstShotSuffix ?? DEFAULT_FIRST_SHOT_SUFFIX;
  const buildRepair = input.buildRepairPrompt ?? defaultRepairPrompt;

  const first = input.firstText !== undefined ? input.firstText : await generate(task.prompt + firstSuffix);
  const firstChk: ConstraintCheck = check(first);

  if (!config.enabled) {
    return { text: first, firstText: first, ok: firstChk.ok, firstOk: firstChk.ok, retries: 0, didRepair: false };
  }

  const maxRetries = Math.max(0, config.maxRetries);
  let cur = first;
  let chk = firstChk;
  let tries = 0;
  while (!chk.ok && tries < maxRetries) {
    tries += 1;
    cur = await generate(buildRepair(task.prompt, cur, chk.violation));
    chk = check(cur);
  }

  return { text: cur, firstText: first, ok: chk.ok, firstOk: firstChk.ok, retries: tries, didRepair: tries > 0 };
}
