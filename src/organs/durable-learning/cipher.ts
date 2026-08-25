import type { Lesson } from './store.js';

/**
 * A tiny decode task used to demonstrate durable learning: a substitution cipher the
 * system is not told about up front. Cold, a weak base guesses; once the decoding rule
 * is learned and stored, a later session recalls it and decodes correctly.
 *
 * This ships the cipher math, the lesson text, and the task prompt. The demonstration
 * base (scripted to depend on whether the rule is present) lives in the bench and test,
 * not here, so the library carries no rigged model.
 */

function shiftLetter(ch: string, by: number): string {
  const c = ch.charCodeAt(0);
  if (c >= 97 && c <= 122) return String.fromCharCode(((c - 97 + by) % 26 + 26) % 26 + 97);
  if (c >= 65 && c <= 90) return String.fromCharCode(((c - 65 + by) % 26 + 26) % 26 + 65);
  return ch;
}

export function caesarEncode(word: string, shift: number): string {
  return [...word].map((ch) => shiftLetter(ch, shift)).join('');
}

export function caesarDecode(word: string, shift: number): string {
  return caesarEncode(word, -shift);
}

/** The decoding rule, as a durable lesson. `cue` "decode" matches the task prompt. */
export function cipherLesson(shift: number): Lesson {
  return {
    id: 'cipher-shift',
    cue: 'decode',
    content: `The cipher is a Caesar shift of +${shift}. To decode a word, shift each letter back by ${shift}.`,
  };
}

export function cipherTaskPrompt(ciphered: string): string {
  return `Decode this word from the cipher: "${ciphered}". Reply with only the decoded word, lowercase, nothing else.`;
}

/** A small plaintext word list for the demo. */
export const CIPHER_WORDS = ['harbor', 'lantern', 'meadow', 'compass', 'thunder', 'orchard', 'granite', 'willow'];
