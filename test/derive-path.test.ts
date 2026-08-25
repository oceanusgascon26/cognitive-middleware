import test from 'node:test';
import assert from 'node:assert/strict';
import { MockBase } from '../src/base/mock.js';
import { runEval } from '../src/harness/run.js';
import { combineConstraints, deriveConstraintCheckers } from '../src/organs/instruction-following/checkers.js';
import { InstructionFollowingOrgan, scoreInstructionFollowing } from '../src/organs/instruction-following/organ.js';

// Regression for the deriver's arbitrary-prompt path (the suite otherwise only exercises
// the well-behaved reproduction tasks, which is how the two defects below slipped past it).

test('bare comparatives are not turned into exact-count constraints (regression)', () => {
  const fourSentences = 'One thing here. Two things here. Three things here. Four things here.';
  for (const p of [
    'Write about dogs in more than 3 sentences.',
    'Write about dogs in fewer than 5 sentences.',
    'Write about dogs in less than 5 sentences.',
  ]) {
    assert.equal(scoreInstructionFollowing(p, fourSentences), true, `"${p}" must not force an exact count`);
  }
  // and the explicit-limit form stays suppressed too
  assert.equal(scoreInstructionFollowing('Write about dogs in no more than 3 sentences.', fourSentences), true);
});

test('the word "letters" does not inject a spurious forbidden letter (regression)', () => {
  const check = combineConstraints(deriveConstraintCheckers('Do not use the letter e. Talk about letters of the alphabet.'));
  assert.ok(check, 'a no-letter constraint should be derived');
  // only "e" is forbidden, so an e-free sentence that contains "s" must pass
  assert.equal(check!('A blur of light spills on us all.').ok, true);
  // a sentence containing "e" must fail
  assert.equal(check!('There is one.').ok, false);
});

test('runEval exercises the base-vs-organ harness on the derive path', async () => {
  const base = new MockBase(() => 'hello world'); // 2 words, never satisfies "exactly 20"
  const tasks = [{ id: 'wc', prompt: 'Write a description of the ocean in exactly 20 words.' }];
  const res = await runEval({
    tasks,
    score: scoreInstructionFollowing,
    base,
    organ: new InstructionFollowingOrgan({ enabled: true, maxRetries: 2 }),
  });
  assert.equal(res.base.length, 1);
  assert.equal(res.organ.length, 1);
  assert.equal(res.base[0]!.passed, false);
  assert.ok(typeof res.ci.delta === 'number');
});
