/**
 * Instruction-following bench: verify-and-repair vs one-shot on a real base.
 *
 * Reproduces the paper-style result. Needs a base that actually fails part of the
 * set, so choose a base with headroom (a lighter model). Run:
 *
 *   BASE_MODEL="anthropic:claude-haiku-4-5" ANTHROPIC_API_KEY=... npm run bench:instruction-following
 *   BASE_MODEL="openai-compat:<model>" OPENAI_BASE_URL=http://127.0.0.1:PORT/v1 npm run bench:instruction-following
 *
 * There is no mock fallback here on purpose: a mock cannot reproduce a real base's
 * failure rate. The hermetic proof of the loop mechanics lives in test/.
 */
import type { ItemResult } from '../src/base/types.js';
import { makeBaseFromEnv } from '../src/base/from-env.js';
import { TASKS } from '../src/organs/instruction-following/constraints.js';
import { runConstraintRepair } from '../src/organs/instruction-following/repair.js';
import { pairedDeltaCI, pct, pp } from '../src/harness/stats.js';

const R = Number(process.env.REPAIR_MAX_RETRIES ?? 3);

async function main(): Promise<void> {
  const base = makeBaseFromEnv();
  console.log(`base: ${base.id}   tasks: ${TASKS.length}   max retries: ${R}\n`);
  const baseRes: ItemResult[] = [];
  const organRes: ItemResult[] = [];
  for (const task of TASKS) {
    const r = await runConstraintRepair({
      task,
      check: task.check,
      generate: (prompt) => base.generate(prompt, { maxTokens: 512 }),
      config: { enabled: true, maxRetries: R },
    });
    baseRes.push({ id: task.id, passed: r.firstOk });
    organRes.push({ id: task.id, passed: r.ok });
    console.log(`  ${task.id.padEnd(18)} base=${r.firstOk ? 'PASS' : 'fail'} repair=${r.ok ? 'PASS' : 'fail'} (retries=${r.retries})`);
  }
  const ci = pairedDeltaCI(baseRes, organRes, { seed: 1 });
  console.log('\n==== instruction-following: verify-and-repair ====');
  console.log(`  baseline (one-shot) : ${pct(ci.baseRate)}`);
  console.log(`  base + organ        : ${pct(ci.organRate)}`);
  console.log(`  delta               : ${pp(ci.delta)}  95% CI [${pp(ci.lo)}, ${pp(ci.hi)}]  excludes 0: ${ci.excludesZero ? 'YES' : 'no'}`);
  console.log('==================================================\n');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
