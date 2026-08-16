/**
 * Seeded Monte Carlo savings trajectory — ported from HōMI production
 * (lib/tools/montecarlo.ts). Deterministic PRNG so SSR/client never diverge.
 * Educational modeling only — not investment advice.
 */

export function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function gaussianRandom(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface MonteCarloInputs {
  currentSavings: number;
  monthlyContribution: number;
  years: number;
  expectedReturnPct: number;
  volatilityPct: number;
  targetAmount?: number;
  seed?: number;
  runs?: number;
  monthlyExpenses?: number;
}

export interface YearBand {
  year: number;
  p10: number;
  p50: number;
  p90: number;
}

export interface MonteCarloResult {
  bands: YearBand[];
  probabilityOfTarget: number | null;
  finalP10: number;
  finalP50: number;
  finalP90: number;
  survivalRate: number;
  distressRate: number;
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const idx = (sortedValues.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedValues[lo]!;
  const frac = idx - lo;
  return sortedValues[lo]! * (1 - frac) + sortedValues[hi]! * frac;
}

export function runMonteCarlo(inputs: MonteCarloInputs): MonteCarloResult {
  const runs = inputs.runs ?? 2500;
  const seed = inputs.seed ?? 42;
  const months = Math.round(inputs.years * 12);
  const monthlyMean = inputs.expectedReturnPct / 100 / 12;
  const monthlyVol = inputs.volatilityPct / 100 / Math.sqrt(12);
  const monthlyExpenses =
    inputs.monthlyExpenses ?? Math.max(inputs.monthlyContribution * 2, 500);

  const rng = mulberry32(seed);
  const yearsCount = Math.ceil(months / 12);
  const trajectories: number[][] = [];
  let reachedTarget = 0;
  let survivedRuns = 0;
  let distressedRuns = 0;

  for (let r = 0; r < runs; r++) {
    let balance = inputs.currentSavings;
    const yearly: number[] = [];
    let wentNegative = false;
    let wasDistressed = false;

    for (let m = 1; m <= months; m++) {
      const monthInYear = ((m - 1) % 12) + 1;
      const shock = gaussianRandom(rng) * monthlyVol;
      const monthlyReturn = monthlyMean + shock;
      balance = balance * (1 + monthlyReturn) + inputs.monthlyContribution;
      if (balance < 0) {
        wentNegative = true;
        balance = 0;
      }
      if (balance < monthlyExpenses) wasDistressed = true;

      if (monthInYear === 12 || m === months) {
        yearly.push(balance);
      }
    }

    trajectories.push(yearly);
    if (inputs.targetAmount != null && balance >= inputs.targetAmount) {
      reachedTarget++;
    }
    if (!wentNegative) survivedRuns++;
    if (wasDistressed) distressedRuns++;
  }

  const bands: YearBand[] = [];
  for (let y = 0; y < yearsCount; y++) {
    const valuesAtYear = trajectories
      .map((t) => t[y] ?? t[t.length - 1] ?? 0)
      .sort((a, b) => a - b);
    bands.push({
      year: y + 1,
      p10: percentile(valuesAtYear, 0.1),
      p50: percentile(valuesAtYear, 0.5),
      p90: percentile(valuesAtYear, 0.9),
    });
  }

  const finalValues = trajectories
    .map((t) => t[t.length - 1] ?? 0)
    .sort((a, b) => a - b);

  return {
    bands,
    probabilityOfTarget:
      inputs.targetAmount != null ? (reachedTarget / runs) * 100 : null,
    finalP10: percentile(finalValues, 0.1),
    finalP50: percentile(finalValues, 0.5),
    finalP90: percentile(finalValues, 0.9),
    survivalRate: (survivedRuns / runs) * 100,
    distressRate: (distressedRuns / runs) * 100,
  };
}
