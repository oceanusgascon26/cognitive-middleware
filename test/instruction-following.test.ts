import test from 'node:test';
import assert from 'node:assert/strict';
import { MockBase } from '../src/base/mock.js';
import type { ItemResult } from '../src/base/types.js';
import { InstructionFollowingOrgan } from '../src/organs/instruction-following/organ.js';
import { runConstraintRepair } from '../src/organs/instruction-following/repair.js';
import { TASKS } from '../src/organs/instruction-following/constraints.js';
import { combineConstraints, deriveConstraintCheckers } from '../src/organs/instruction-following/checkers.js';
import { pairedDeltaCI } from '../src/harness/stats.js';

/**
 * A deterministic weak base: on the first shot it returns a non-compliant canned
 * answer; on a repair prompt it applies a targeted fix for the specific violation it
 * is told about, and leaves everything else unchanged. It can fix casing and commas
 * but cannot hit an exact word count, so the delta is real but not total.
 */
function weakBase(): MockBase {
  return new MockBase((prompt: string) => {
    const failMatch = prompt.match(/FAILED this requirement: ([\s\S]*?)\. Rewrite/);
    if (!failMatch) return 'Hello, World';
    const violation = failMatch[1] ?? '';
    const prevMatch = prompt.match(/"""\n([\s\S]*?)\n"""/);
    const prev = prevMatch ? prevMatch[1]! : '';
    if (/uppercase|lowercase/i.test(violation)) return prev.toLowerCase();
    if (/comma/i.test(violation)) return prev.replace(/,/g, '');
    return prev;
  });
}

test('repair lifts pass rate on a weak base and never regresses a pass', async () => {
  const base = weakBase();
  const tasks = TASKS.filter((t) => t.id === 'lowercase-nocomma' || t.id === 'wordcount-20');
  assert.equal(tasks.length, 2);
  const baseRes: ItemResult[] = [];
  const organRes: ItemResult[] = [];
  for (const task of tasks) {
    const r = await runConstraintRepair({
      task,
      check: task.check,
      generate: (p) => base.generate(p),
      config: { enabled: true, maxRetries: 3 },
    });
    baseRes.push({ id: task.id, passed: r.firstOk });
    organRes.push({ id: task.id, passed: r.ok });
  }
  const ci = pairedDeltaCI(baseRes, organRes, { seed: 1 });
  assert.ok(ci.organRate > ci.baseRate, `organ ${ci.organRate} should beat base ${ci.baseRate}`);
  assert.ok(ci.delta > 0);
  for (let i = 0; i < baseRes.length; i++) {
    if (baseRes[i]!.passed) assert.ok(organRes[i]!.passed, 'repair regressed a passing item');
  }
});

test('organ is byte-identical to the base when disabled (constrained prompt)', async () => {
  const base = new MockBase((p) => `ECHO::${p}`);
  const off = new InstructionFollowingOrgan({ enabled: false }).wrap(base);
  const prompt = 'Write one sentence about winter, in all lowercase, with no commas.';
  assert.equal(await off.generate(prompt), await base.generate(prompt));
});

test('organ passes through when enabled but the prompt has no checkable constraint', async () => {
  const base = new MockBase((p) => `ECHO::${p}`);
  const on = new InstructionFollowingOrgan({ enabled: true }).wrap(base);
  const plain = 'Tell me about the ocean.';
  assert.equal(deriveConstraintCheckers(plain).length, 0);
  assert.equal(await on.generate(plain), await base.generate(plain));
});

test('deriveConstraintCheckers extracts a word-count constraint and scores it', () => {
  const cs = deriveConstraintCheckers('Write a description of the ocean in exactly 20 words.');
  const check = combineConstraints(cs);
  assert.ok(check);
  assert.equal(check!('one two three').ok, false);
  assert.equal(check!(Array.from({ length: 20 }, (_, i) => `w${i}`).join(' ')).ok, true);
});
