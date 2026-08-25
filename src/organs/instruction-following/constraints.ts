/**
 * The instruction-following reproduction task set: machine-checkable, IFEval-style
 * format constraints with explicit deterministic checkers. This is the set the paper
 * ran; the bench scores with each task's own checker and the organ repairs against the
 * same checker, so there is no gap between the score and the target.
 *
 * These are author-written prompts. The `deriveConstraintCheckers` path in checkers.ts
 * is the complementary case: parsing constraints out of an arbitrary user prompt.
 */

import type { ConstraintCheck } from './checkers.js';

export interface Task {
  id: string;
  prompt: string;
  check: (t: string) => ConstraintCheck;
}

const words = (t: string) => t.trim().split(/\s+/).filter(Boolean);
const sentences = (t: string) => t.trim().split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
const stripFence = (t: string) => t.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

export const TASKS: Task[] = [
  { id: 'wordcount-20', prompt: 'Write a description of the ocean in exactly 20 words.',
    check: (t) => { const n = words(t).length; return { ok: n === 20, violation: `must be exactly 20 words, got ${n}` }; } },
  { id: 'wordcount-33', prompt: 'Write a short paragraph about autumn in exactly 33 words.',
    check: (t) => { const n = words(t).length; return { ok: n === 33, violation: `must be exactly 33 words, got ${n}` }; } },
  { id: 'no-letter-e', prompt: 'Describe a mountain in two sentences without using the letter "e" anywhere in your response.',
    check: (t) => { const hasE = /[eE]/.test(t); const s = sentences(t).length; return { ok: !hasE && s === 2, violation: hasE ? 'contains the letter e' : `must be exactly 2 sentences, got ${s}` }; } },
  { id: 'no-letter-a', prompt: 'Write one sentence about music that does not contain the letter "a".',
    check: (t) => { const hasA = /[aA]/.test(t); const s = sentences(t).length; return { ok: !hasA && s === 1, violation: hasA ? 'contains the letter a' : `must be exactly 1 sentence, got ${s}` }; } },
  { id: 'json-keys', prompt: 'Return ONLY a JSON object describing a fictional person, with exactly these keys and no others: "name", "age", "city".',
    check: (t) => { try { const o = JSON.parse(stripFence(t)); const k = Object.keys(o).sort().join(','); return { ok: k === 'age,city,name', violation: `keys must be exactly name,age,city; got ${k || '(none)'}` }; } catch { return { ok: false, violation: 'not valid JSON' }; } } },
  { id: 'json-array-5', prompt: 'Return ONLY a JSON array of exactly 5 fruit names as strings.',
    check: (t) => { try { const o = JSON.parse(stripFence(t)); const ok = Array.isArray(o) && o.length === 5 && o.every((x) => typeof x === 'string'); return { ok, violation: `must be a JSON array of exactly 5 strings, got ${Array.isArray(o) ? o.length + ' items' : 'non-array'}` }; } catch { return { ok: false, violation: 'not valid JSON' }; } } },
  { id: 'lowercase-nocomma', prompt: 'Write one sentence about winter, in all lowercase, with no commas.',
    check: (t) => { const up = /[A-Z]/.test(t); const comma = t.includes(','); return { ok: !up && !comma, violation: up ? 'contains uppercase letters' : 'contains a comma' }; } },
  { id: 'bullets-4', prompt: 'List exactly 4 uses for a paperclip. Each use must be on its own line starting with "- ".',
    check: (t) => { const lines = t.split('\n').map((l) => l.trim()).filter(Boolean); const bullets = lines.filter((l) => /^-\s+/.test(l)); return { ok: bullets.length === 4 && bullets.length === lines.length, violation: `must be exactly 4 lines each starting with "- ", got ${bullets.length} bullets / ${lines.length} lines` }; } },
  { id: 'bullets-6', prompt: 'List exactly 6 items you would pack for a hike. Each on its own line starting with "* ".',
    check: (t) => { const lines = t.split('\n').map((l) => l.trim()).filter(Boolean); const bullets = lines.filter((l) => /^\*\s+/.test(l)); return { ok: bullets.length === 6 && bullets.length === lines.length, violation: `must be exactly 6 lines each starting with "* ", got ${bullets.length} bullets / ${lines.length} lines` }; } },
  { id: 'word-twice', prompt: 'Write 3 sentences about coffee. Use the word "morning" exactly twice.',
    check: (t) => { const c = (t.toLowerCase().match(/\bmorning\b/g) || []).length; const s = sentences(t).length; return { ok: c === 2 && s === 3, violation: c !== 2 ? `must use "morning" exactly twice, got ${c}` : `must be 3 sentences, got ${s}` }; } },
  { id: 'startswith-S', prompt: 'Write 3 sentences about dogs. Every sentence must begin with the letter "S".',
    check: (t) => { const ss = sentences(t); const okAll = ss.length === 3 && ss.every((s) => /^s/i.test(s)); return { ok: okAll, violation: ss.length !== 3 ? `must be 3 sentences, got ${ss.length}` : 'every sentence must begin with S' }; } },
  { id: 'endswith-phrase', prompt: 'Explain photosynthesis in exactly 2 sentences, and end your entire response with the exact phrase: THE END',
    check: (t) => { const tr = t.trim(); const ends = tr.endsWith('THE END'); const body = tr.replace(/THE END$/, ''); const s = sentences(body).length; return { ok: ends && s === 2, violation: !ends ? 'must end with the exact phrase THE END' : `body must be exactly 2 sentences, got ${s}` }; } },
  { id: 'title-case-line', prompt: 'Write a single 5-word title about space where every word is capitalized. Output only the title.',
    check: (t) => { const w = words(t); const ok = w.length === 5 && w.every((x) => /^[A-Z]/.test(x)); return { ok, violation: w.length !== 5 ? `must be exactly 5 words, got ${w.length}` : 'every word must start with a capital letter' }; } },
  { id: 'sentences-4', prompt: 'Write exactly 4 sentences about rivers.',
    check: (t) => { const s = sentences(t).length; return { ok: s === 4, violation: `must be exactly 4 sentences, got ${s}` }; } },
  { id: 'no-vowel-a-e', prompt: 'Write one short sentence about the sky using neither the letter "a" nor the letter "e".',
    check: (t) => { const bad = /[aeAE]/.test(t); const s = sentences(t).length; return { ok: !bad && s === 1, violation: bad ? 'contains a or e' : `must be exactly 1 sentence, got ${s}` }; } },
  { id: 'exactly-two-commas', prompt: 'Write one sentence about a city market that contains exactly two commas.',
    check: (t) => { const c = (t.match(/,/g) || []).length; const s = sentences(t).length; return { ok: c === 2 && s === 1, violation: c !== 2 ? `must contain exactly two commas, got ${c}` : `must be one sentence, got ${s}` }; } },
];

// Expansion batch (parametric, weighted to the failure-prone constraint types).
const TOPICS = ['the ocean', 'a garden', 'a train station', 'a bakery', 'the desert', 'a library', 'a harbor', 'a forest'];
let ti = 0;
const topic = () => TOPICS[ti++ % TOPICS.length]!;

for (const n of [12, 15, 25, 40, 50]) TASKS.push({ id: `wc-${n}`, prompt: `Write a description of ${topic()} in exactly ${n} words.`, check: (t) => { const w = words(t).length; return { ok: w === n, violation: `must be exactly ${n} words, got ${w}` }; } });
for (const L of ['o', 't', 's', 'i', 'n']) TASKS.push({ id: `no-${L}`, prompt: `Write one sentence about ${topic()} that does not contain the letter "${L}".`, check: (t) => { const re = new RegExp(L, 'i'); const s = sentences(t).length; return { ok: !re.test(t) && s === 1, violation: re.test(t) ? `contains the letter ${L}` : `must be exactly 1 sentence, got ${s}` }; } });
for (const c of [1, 3]) TASKS.push({ id: `commas-${c}`, prompt: `Write one sentence about ${topic()} containing exactly ${c} comma${c === 1 ? '' : 's'}.`, check: (t) => { const n = (t.match(/,/g) || []).length; const s = sentences(t).length; return { ok: n === c && s === 1, violation: n !== c ? `must contain exactly ${c} commas, got ${n}` : `must be one sentence, got ${s}` }; } });
for (const n of [2, 5, 6]) TASKS.push({ id: `sent-${n}`, prompt: `Write exactly ${n} sentences about ${topic()}.`, check: (t) => { const s = sentences(t).length; return { ok: s === n, violation: `must be exactly ${n} sentences, got ${s}` }; } });
for (const L of ['T', 'B', 'M']) TASKS.push({ id: `start-${L}`, prompt: `Write 4 sentences about ${topic()}. Every sentence must begin with the letter "${L}".`, check: (t) => { const ss = sentences(t); const ok = ss.length === 4 && ss.every((s) => s.toUpperCase().startsWith(L)); return { ok, violation: ss.length !== 4 ? `must be 4 sentences, got ${ss.length}` : `every sentence must begin with ${L}` }; } });
TASKS.push({ id: 'water-3', prompt: 'Write 4 sentences about a river. Use the word "water" exactly 3 times.', check: (t) => { const c = (t.toLowerCase().match(/\bwater\b/g) || []).length; const s = sentences(t).length; return { ok: c === 3 && s === 4, violation: c !== 3 ? `must use "water" exactly 3 times, got ${c}` : `must be 4 sentences, got ${s}` }; } });
TASKS.push({ id: 'time-2', prompt: 'Write 3 sentences about clocks. Use the word "time" exactly twice.', check: (t) => { const c = (t.toLowerCase().match(/\btime\b/g) || []).length; const s = sentences(t).length; return { ok: c === 2 && s === 3, violation: c !== 2 ? `must use "time" exactly twice, got ${c}` : `must be 3 sentences, got ${s}` }; } });
TASKS.push({ id: 'uppercase', prompt: 'Write one sentence about victory in ALL UPPERCASE letters.', check: (t) => { const low = /[a-z]/.test(t); const s = sentences(t).length; return { ok: !low && s === 1, violation: low ? 'contains lowercase letters' : `must be one sentence, got ${s}` }; } });
TASKS.push({ id: 'excl-3', prompt: 'Write 3 short sentences about a festival. Each sentence must end with an exclamation mark.', check: (t) => { const ex = (t.match(/!/g) || []).length; const s = sentences(t).length; return { ok: ex === 3 && s === 3, violation: ex !== 3 ? `must have exactly 3 exclamation marks, got ${ex}` : `must be 3 sentences, got ${s}` }; } });
TASKS.push({ id: 'title-7', prompt: 'Write a 7-word title about exploration where every word is capitalized. Output only the title.', check: (t) => { const w = words(t); const ok = w.length === 7 && w.every((x) => /^[A-Z]/.test(x)); return { ok, violation: w.length !== 7 ? `must be exactly 7 words, got ${w.length}` : 'every word must start with a capital letter' }; } });
