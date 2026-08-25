import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rmSync } from 'node:fs';
import { MockBase } from '../src/base/mock.js';
import { JsonFileStore, MemoryStore } from '../src/organs/durable-learning/store.js';
import { DurableLearningOrgan } from '../src/organs/durable-learning/organ.js';
import { CIPHER_WORDS, caesarDecode, caesarEncode, cipherLesson, cipherTaskPrompt } from '../src/organs/durable-learning/cipher.js';

const SHIFT = 3;

/** A base that can decode ONLY when the rule is present in the prompt (isolates the
 *  effect of recalled memory from the strength of the base). */
function cipherBase(): MockBase {
  return new MockBase((prompt: string) => {
    const q = prompt.match(/"([a-zA-Z]+)"/);
    const ciphered = q ? q[1]! : '';
    const rule = prompt.match(/shift each letter back by (\d+)/i);
    if (rule) return caesarDecode(ciphered, Number(rule[1]));
    return ciphered; // cold guess (wrong for any nonzero shift)
  });
}

const scoreDecode = (word: string, output: string): boolean => output.trim().toLowerCase() === word.toLowerCase();

test('a lesson learned in session 1 persists and lifts a cold base 0 -> 100 in session 2', async () => {
  const path = join(tmpdir(), `cm-durable-test-${process.pid}.json`);
  rmSync(path, { force: true });
  try {
    const base = cipherBase();
    const tasks = CIPHER_WORDS.slice(0, 6).map((w) => ({ word: w, prompt: cipherTaskPrompt(caesarEncode(w, SHIFT)) }));

    // Session 1: fresh store, cold. Nothing to recall -> decodes nothing.
    const organ1 = new DurableLearningOrgan(new JsonFileStore(path));
    const w1 = organ1.wrap(base);
    let cold = 0;
    for (const t of tasks) if (scoreDecode(t.word, await w1.generate(t.prompt))) cold++;
    assert.equal(cold, 0, 'cold base should decode nothing without the rule');

    organ1.learn(cipherLesson(SHIFT)); // persist to disk

    // Session 2: a NEW store instance re-reads the file, as a fresh process would.
    const store2 = new JsonFileStore(path);
    assert.equal(store2.size(), 1, 'the lesson should have persisted to disk');
    const w2 = new DurableLearningOrgan(store2).wrap(base);
    let warm = 0;
    for (const t of tasks) if (scoreDecode(t.word, await w2.generate(t.prompt))) warm++;
    assert.equal(warm, tasks.length, 'warm session should decode everything via the recalled rule');
  } finally {
    rmSync(path, { force: true });
  }
});

test('durable-learning organ is byte-identical to the base when disabled, even with a matching lesson', async () => {
  const store = new MemoryStore();
  store.put(cipherLesson(SHIFT)); // a lesson whose cue "decode" matches the prompt
  const base = new MockBase((p) => `ECHO::${p}`);
  const off = new DurableLearningOrgan(store, { enabled: false }).wrap(base);
  const prompt = cipherTaskPrompt('kdueru');
  assert.equal(await off.generate(prompt), await base.generate(prompt));
});

test('durable-learning passes through when enabled but nothing is recalled', async () => {
  const base = new MockBase((p) => `ECHO::${p}`);
  const on = new DurableLearningOrgan(new MemoryStore(), { enabled: true }).wrap(base);
  const prompt = 'What is the capital of France?';
  assert.equal(await on.generate(prompt), await base.generate(prompt));
});
