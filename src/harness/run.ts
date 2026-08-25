import type { BaseModel, GenerateOptions, ItemResult, Organ } from '../base/types.js';
import { pairedDeltaCI, type DeltaCI } from './stats.js';

export interface EvalTask {
  id: string;
  prompt: string;
  opts?: GenerateOptions;
}

export interface EvalResult {
  base: ItemResult[];
  organ: ItemResult[];
  ci: DeltaCI;
}

/**
 * Run every task through the base and through the organ-wrapped base, score both
 * with the SAME predicate, and return paired results plus a bootstrap CI on the
 * delta. Scoring with the same predicate the organ repairs against is the point:
 * there is no gap between "looks right" and "is right".
 */
export async function runEval(params: {
  tasks: EvalTask[];
  score: (prompt: string, output: string) => boolean;
  base: BaseModel;
  organ: Organ;
  seed?: number;
}): Promise<EvalResult> {
  const { tasks, score, base, organ } = params;
  const wrapped = organ.wrap(base);
  const baseRes: ItemResult[] = [];
  const organRes: ItemResult[] = [];
  for (const t of tasks) {
    const bo = await base.generate(t.prompt, t.opts);
    baseRes.push({ id: t.id, passed: score(t.prompt, bo) });
    const oo = await wrapped.generate(t.prompt, t.opts);
    organRes.push({ id: t.id, passed: score(t.prompt, oo) });
  }
  return { base: baseRes, organ: organRes, ci: pairedDeltaCI(baseRes, organRes, { seed: params.seed }) };
}
