/** Public entry point for the kit. */

export * from './base/types.js';
export { MockBase } from './base/mock.js';
export { anthropicBase } from './base/anthropic.js';
export { openAICompatBase } from './base/openai-compat.js';
export { makeBase, makeBaseFromEnv } from './base/from-env.js';

export * from './organs/instruction-following/checkers.js';
export * from './organs/instruction-following/repair.js';
export { InstructionFollowingOrgan, scoreInstructionFollowing } from './organs/instruction-following/organ.js';
export { TASKS } from './organs/instruction-following/constraints.js';
export type { Task } from './organs/instruction-following/constraints.js';

export * from './organs/durable-learning/store.js';
export { DurableLearningOrgan } from './organs/durable-learning/organ.js';
export * from './organs/durable-learning/cipher.js';

export { runEval } from './harness/run.js';
export type { EvalTask, EvalResult } from './harness/run.js';
export { pairedDeltaCI, mulberry32, pct, pp } from './harness/stats.js';
export type { DeltaCI } from './harness/stats.js';
