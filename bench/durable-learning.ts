/**
 * Durable-learning demonstration: a lesson learned once persists to disk and changes
 * behavior in a later, cold session.
 *
 * The base here is a scripted demonstration base that decodes only when it has been
 * given the rule, which isolates the effect of recalled memory from the strength of the
 * base. Point it at a real base with a genuinely hard, novel mapping to measure a real
 * cold-vs-warm delta. The store persists across runs: run this twice and the second run
 * loads the lesson from disk before it does anything.
 */
import { join } from 'node:path';
import { MockBase } from '../src/base/mock.js';
import { JsonFileStore, MemoryStore } from '../src/organs/durable-learning/store.js';
import { DurableLearningOrgan } from '../src/organs/durable-learning/organ.js';
import { CIPHER_WORDS, caesarDecode, caesarEncode, cipherLesson, cipherTaskPrompt } from '../src/organs/durable-learning/cipher.js';
import { pct } from '../src/harness/stats.js';

const SHIFT = 3;
const STORE_PATH = join('data', 'durable-learning-store.json');

function cipherBase(): MockBase {
  return new MockBase((prompt: string) => {
    const q = prompt.match(/"([a-zA-Z]+)"/);
    const ciphered = q ? q[1]! : '';
    const rule = prompt.match(/shift each letter back by (\d+)/i);
    return rule ? caesarDecode(ciphered, Number(rule[1])) : ciphered;
  });
}

const score = (word: string, out: string): boolean => out.trim().toLowerCase() === word.toLowerCase();

async function measure(organ: DurableLearningOrgan, base: MockBase, tasks: Array<{ word: string; prompt: string }>): Promise<number> {
  const w = organ.wrap(base);
  let pass = 0;
  for (const t of tasks) if (score(t.word, await w.generate(t.prompt))) pass++;
  return pass / tasks.length;
}

async function main(): Promise<void> {
  const base = cipherBase();
  const tasks = CIPHER_WORDS.map((word) => ({ word, prompt: cipherTaskPrompt(caesarEncode(word, SHIFT)) }));

  // Cold baseline: no memory at all (organ disabled). Always the true floor.
  const cold = await measure(new DurableLearningOrgan(new MemoryStore(), { enabled: false }), base, tasks);

  // Ensure the rule is learned and persisted to disk.
  const store = new JsonFileStore(STORE_PATH);
  const learnedAlready = store.size() > 0;
  const organ = new DurableLearningOrgan(store);
  if (!learnedAlready) organ.learn(cipherLesson(SHIFT));

  // Warm: a fresh store instance re-reads the file, as a new process would.
  const warm = await measure(new DurableLearningOrgan(new JsonFileStore(STORE_PATH)), base, tasks);

  console.log('==== durable learning: cross-session recall ====');
  console.log(`  store path            : ${STORE_PATH} ${learnedAlready ? '(warm from a previous run)' : '(learned this run)'}`);
  console.log(`  cold (no memory)      : ${pct(cold)}`);
  console.log(`  warm (recalled rule)  : ${pct(warm)}`);
  console.log('  the lesson persisted to disk; a fresh store instance recalled it');
  console.log('================================================');
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
