/**
 * Machine-checkable constraint predicates for instruction-following.
 *
 * A predicate is a deterministic function of the model text only. The score uses
 * the same predicate the repair organ optimizes against, so there is no gap between
 * "looks right" and "is right". `deriveConstraintCheckers` parses common IFEval-style
 * format constraints out of a free-text prompt; an ordinary prompt yields nothing and
 * the organ becomes a no-op.
 */

/** One machine-checkable verdict over the model text. `ok` true means satisfied;
 *  `violation` is a specific, human-and-model-readable reason used to steer repair. */
export interface ConstraintCheck {
  ok: boolean;
  violation: string;
}

/** THE predicate: a deterministic function of the model text only. */
export type ConstraintPredicate = (text: string) => ConstraintCheck;

/** One extracted, concrete checker (a labeled predicate). */
export interface DerivedConstraint {
  id: string;
  check: ConstraintPredicate;
}

const _words = (t: string): string[] => t.trim().split(/\s+/).filter(Boolean);
// Naive sentence split: every . ! ? is a boundary, so abbreviations like "Dr." over-count.
// Adequate for the shipped tasks (which avoid abbreviations); a known limit on arbitrary prose.
const _sentences = (t: string): string[] =>
  t.trim().split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
const _stripFence = (t: string): string =>
  t.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

const NUM_WORD: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, once: 1, twice: 2,
};

function parseCount(s: string): number | null {
  const n = Number(s);
  if (Number.isFinite(n)) return n;
  return NUM_WORD[s.trim().toLowerCase()] ?? null;
}

/**
 * Parse a prompt into zero or more concrete machine-checkable constraints.
 * Deterministic and pure (regex only, no I/O). Empty array for an ordinary prompt.
 * Count-based checkers are suppressed when the prompt hedges (approx / ranges / bare
 * comparatives), so "in about 50 words", "at least 3 sentences", and "more than 3
 * sentences" are not forced to an exact N.
 */
export function deriveConstraintCheckers(userText: string): DerivedConstraint[] {
  const t = typeof userText === 'string' ? userText : '';
  const out: DerivedConstraint[] = [];
  const push = (id: string, check: ConstraintPredicate) => out.push({ id, check });
  const approx =
    /\b(or fewer|or less|or more|at least|at most|up to|no more than|no fewer than|a few|several|maximum|minimum)\b/i.test(t) ||
    /\b(?:about|around|roughly|approximately)\s+\d/i.test(t) ||
    /\b(?:more than|fewer than|less than|greater than|no larger than|no smaller than|over|under)\s+\d/i.test(t);
  let m: RegExpMatchArray | null;

  // exact word count: "exactly N words" | "in N words" | "N-word"
  if (!approx) {
    m = t.match(/\bexactly\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+words?\b/i) ||
      t.match(/\bin\s+(\d+)\s+words?\b/i) ||
      t.match(/\b(\d+)[-\s]word\b/i);
    if (m) { const n = parseCount(m[1]!); if (n !== null) push('word-count', (x) => { const c = _words(x).length; return { ok: c === n, violation: `must be exactly ${n} words, got ${c}` }; }); }
  }

  // exact sentence count
  if (!approx) {
    m = t.match(/\b(?:exactly\s+|in\s+|write\s+)(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+sentences?\b/i) ||
      t.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+sentences?\b/i);
    if (m) { const n = parseCount(m[1]!); if (n !== null) push('sentence-count', (x) => { const c = _sentences(x).length; return { ok: c === n, violation: `must be exactly ${n} sentences, got ${c}` }; }); }
  }

  // forbidden letters ("without using the letter e", "neither the letter a nor the letter e").
  // The capture requires whitespace after "letter" and a boundary after the letter, so the
  // word "letters" and phrases like "letter each" do not inject a spurious forbidden letter.
  if (/\b(without using|does not contain|do not use|not contain|avoid|neither|nor)\b/i.test(t) && /\bletter\b/i.test(t)) {
    const letters = [...t.matchAll(/\bletter\s+["']?([a-z])["']?(?![a-z])/gi)].map((x) => x[1]!.toLowerCase());
    const uniq = [...new Set(letters)];
    if (uniq.length) push('no-letter', (x) => { const bad = uniq.find((L) => new RegExp(L, 'i').test(x)); return { ok: !bad, violation: bad ? `must not contain the letter "${bad}"` : '' }; });
  }

  // casing
  if (/\ball\s+lowercase\b/i.test(t)) push('all-lowercase', (x) => ({ ok: !/[A-Z]/.test(x), violation: 'must be all lowercase' }));
  if (/\ball\s+uppercase\b/i.test(t)) push('all-uppercase', (x) => ({ ok: !/[a-z]/.test(x), violation: 'must be all uppercase' }));

  // commas: exact count OR none
  m = t.match(/\bexactly\s+(\d+|one|two|three|four|five)\s+commas?\b/i);
  if (m && !approx) { const n = parseCount(m[1]!); if (n !== null) push('comma-count', (x) => { const c = (x.match(/,/g) || []).length; return { ok: c === n, violation: `must contain exactly ${n} commas, got ${c}` }; }); }
  else if (/\bno\s+commas?\b|\bwithout\s+(?:any\s+)?commas?\b/i.test(t)) push('no-comma', (x) => ({ ok: !x.includes(','), violation: 'must contain no commas' }));

  // valid JSON (+ optional array length + required keys). Keys are harvested only from the
  // text after the word "keys", so an incidental quoted token elsewhere is not made mandatory.
  if (/\bjson\b/i.test(t)) {
    const arr = t.match(/\barray of (?:exactly )?(\d+)/i);
    const keyZone = t.match(/\bkeys?\b([\s\S]*)$/i)?.[1] ?? '';
    const keyList = [...keyZone.matchAll(/["']([a-z_][a-z0-9_]*)["']/gi)].map((x) => x[1]!);
    push('json', (x) => {
      let parsed: unknown;
      try { parsed = JSON.parse(_stripFence(x)); } catch { return { ok: false, violation: 'must be valid JSON' }; }
      if (arr) { const n = Number(arr[1]); if (!Array.isArray(parsed) || parsed.length !== n) return { ok: false, violation: `must be a JSON array of exactly ${n} items` }; }
      if (/\bkeys?\b/i.test(t) && keyList.length && parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const have = new Set(Object.keys(parsed as Record<string, unknown>));
        const missing = keyList.find((k) => !have.has(k));
        if (missing) return { ok: false, violation: `JSON must include the key "${missing}"` };
      }
      return { ok: true, violation: '' };
    });
  }

  // line/bullet count ("N items/uses/lines, each on its own line")
  if (!approx && (/\bon its own line\b/i.test(t) || /\beach\s+(?:use|item|line|point|one|sentence)\b/i.test(t))) {
    const lm = t.match(/\b(?:exactly\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:uses?|items?|lines?|bullet points?|points?|things?)\b/i);
    if (lm) { const n = parseCount(lm[1]!); if (n !== null) push('line-count', (x) => { const c = x.split('\n').map((l) => l.trim()).filter(Boolean).length; return { ok: c === n, violation: `must be exactly ${n} non-empty lines, got ${c}` }; }); }
  }

  // ends with an exact phrase
  m = t.match(/\bexact phrase\b\s*[:\-]?\s*["']?(.+?)["']?\s*$/i);
  if (m) { const phrase = m[1]!.trim(); if (phrase) push('ends-with', (x) => ({ ok: x.trim().endsWith(phrase), violation: `must end with the exact phrase "${phrase}"` })); }

  // every sentence begins with a given letter
  m = t.match(/every sentence\b[^.]*?\bbegin[^.]*?\bletter\s+["']?([a-z])["']?/i);
  if (m) { const L = m[1]!.toUpperCase(); push('sentence-start', (x) => { const ss = _sentences(x); const ok = ss.length > 0 && ss.every((s) => s.toUpperCase().startsWith(L)); return { ok, violation: `every sentence must begin with "${L}"` }; }); }

  // a word used an exact number of times
  m = t.match(/\buse the word\s+["']?([a-z]+)["']?\s+exactly\s+(\d+|once|twice)\b/i) ||
    t.match(/\buse the word\s+["']?([a-z]+)["']?\s+(\d+|once|twice)\s+times?\b/i);
  if (m) { const w = m[1]!.toLowerCase(); const n = parseCount(m[2]!); if (n !== null) push('word-times', (x) => { const c = (x.toLowerCase().match(new RegExp(`\\b${w}\\b`, 'g')) || []).length; return { ok: c === n, violation: `must use the word "${w}" exactly ${n} times, got ${c}` }; }); }

  // every word capitalized
  if (/every word\b[^.]*?capitali[sz]ed/i.test(t)) push('word-caps', (x) => { const ws = _words(x); const ok = ws.length > 0 && ws.every((w) => /^[^a-zA-Z]*[A-Z]/.test(w)); return { ok, violation: 'every word must be capitalized' }; });

  return out;
}

/** AND together the derived constraints into ONE predicate (first violation wins).
 *  Returns null when there is nothing checkable, so the caller can no-op cleanly. */
export function combineConstraints(cs: DerivedConstraint[]): ConstraintPredicate | null {
  if (!cs || cs.length === 0) return null;
  return (text: string): ConstraintCheck => {
    for (const c of cs) { const r = c.check(text); if (!r.ok) return r; }
    return { ok: true, violation: '' };
  };
}
