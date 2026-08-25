import type { ItemResult } from '../base/types.js';

/** Deterministic PRNG so bootstrap confidence intervals are reproducible run to run. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DeltaCI {
  n: number;
  baseRate: number;
  organRate: number;
  /** organRate - baseRate. */
  delta: number;
  /** Lower and upper percentile bounds on the delta. */
  lo: number;
  hi: number;
  alpha: number;
  iters: number;
  /** True when the whole interval lies on one side of zero. */
  excludesZero: boolean;
}

/**
 * Paired bootstrap CI for the difference in pass rate between base+organ and base,
 * over the same items. The two arrays must cover the same ids (paired by item).
 */
export function pairedDeltaCI(
  base: ItemResult[],
  organ: ItemResult[],
  opts: { iters?: number; alpha?: number; seed?: number } = {},
): DeltaCI {
  const iters = opts.iters ?? 2000;
  const alpha = opts.alpha ?? 0.05;
  const seed = opts.seed ?? 12345;
  if (base.length !== organ.length) {
    throw new Error(`paired CI requires aligned arrays: base ${base.length} vs organ ${organ.length}`);
  }
  const byId = new Map(organ.map((r) => [r.id, r]));
  const pairs: Array<readonly [number, number]> = base.map((b) => {
    const o = byId.get(b.id);
    if (!o) throw new Error(`no organ result for item ${b.id}`);
    return [b.passed ? 1 : 0, o.passed ? 1 : 0] as const;
  });
  const n = pairs.length;
  if (n === 0) throw new Error('no items to score');
  const baseRate = pairs.reduce((s, p) => s + p[0], 0) / n;
  const organRate = pairs.reduce((s, p) => s + p[1], 0) / n;
  const rng = mulberry32(seed);
  const deltas: number[] = [];
  for (let it = 0; it < iters; it++) {
    let sb = 0;
    let so = 0;
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(rng() * n);
      const p = pairs[idx]!;
      sb += p[0];
      so += p[1];
    }
    deltas.push((so - sb) / n);
  }
  deltas.sort((a, b) => a - b);
  const loIdx = Math.max(0, Math.floor((alpha / 2) * iters));
  const hiIdx = Math.min(iters - 1, Math.ceil((1 - alpha / 2) * iters) - 1);
  const lo = deltas[loIdx]!;
  const hi = deltas[hiIdx]!;
  return {
    n,
    baseRate,
    organRate,
    delta: organRate - baseRate,
    lo,
    hi,
    alpha,
    iters,
    excludesZero: lo > 0 || hi < 0,
  };
}

export function pct(x: number): string {
  return (x * 100).toFixed(1) + '%';
}

export function pp(x: number): string {
  const v = x * 100;
  return (v >= 0 ? '+' : '') + v.toFixed(1) + 'pp';
}
