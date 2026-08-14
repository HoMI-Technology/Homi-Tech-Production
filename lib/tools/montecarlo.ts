/**
 * Seeded Monte Carlo savings-trajectory simulation.
 * Uses mulberry32 (deterministic PRNG) + Box-Muller transform for
 * normally-distributed returns, so results are reproducible and never
 * cause hydration mismatches when seeded consistently.
 */

/**
 * Canon engine config for Tools MC and Money · Decide MC.
 * Both surfaces must pass these `runs` and `seed` values. Never print
 * the run count in UI — hub/registry copy stays "Simulated paths. Not a forecast."
 */
export const MONTE_CARLO_ENGINE = {
  runs: 10_000,
  seed: 1337,
  defaultYears: 10,
  defaultReturnPct: 7,
  defaultVolatilityPct: 15,
} as const;

/** Deterministic 32-bit PRNG. Returns a function producing floats in [0, 1). */
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

/** Box-Muller transform: converts two uniform [0,1) samples into one standard-normal sample. */
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
  expectedReturnPct: number; // annual, e.g. 7
  volatilityPct: number; // annual std dev, e.g. 15
  targetAmount?: number;
  seed?: number;
  runs?: number;
  /**
   * Annual probability (0-20) of a job-loss event firing in a given year,
   * expressed as a percentage point, e.g. 5 = 5%/year. Omitted or 0 disables
   * job-loss modeling entirely (and consumes no extra RNG draws, preserving
   * exact backward-compatible output for existing callers).
   */
  jobLossProb?: number;
  /**
   * Annual probability (0-30) of a maintenance/emergency shock firing in a
   * given year, as a percentage point, e.g. 10 = 10%/year. Omitted or 0
   * disables shock modeling entirely (same backward-compat guarantee as
   * jobLossProb).
   */
  maintenanceShock?: number;
  /**
   * Annual % growth applied to monthlyContribution over time (raises/income
   * growth). Compounded monthly: contribution(m) = monthlyContribution *
   * (1 + incomeGrowth/100/12)^(m-1). Omitted or 0 leaves the contribution
   * flat, identical to pre-upgrade behavior.
   */
  incomeGrowth?: number;
  /**
   * Optional internal estimate of monthly expenses, used only for sizing
   * maintenance shocks and for the distressRate calculation. There is no
   * dedicated "monthly expenses" UI input today, so this defaults to a
   * heuristic of 2x the monthly contribution (floored at $500) when omitted.
   */
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
  /** % (0-100) of simulated runs where the balance never dropped below 0. */
  survivalRate: number;
  /**
   * % (0-100) of simulated runs where the balance dropped below one month
   * of (estimated) expenses at any point during the simulation, not just
   * at the end.
   */
  distressRate: number;
}

/**
 * Runs N seeded simulations of a savings trajectory with random monthly
 * returns drawn from a normal distribution, and returns P10/P50/P90 bands
 * per year plus (optionally) the probability of reaching a target amount.
 *
 * Also (optionally) models job-loss years (a period of reduced contribution)
 * and maintenance/emergency shocks (a lump-sum hit sized in months of
 * estimated expenses), and reports survivalRate / distressRate across runs.
 */
export function runMonteCarlo(inputs: MonteCarloInputs): MonteCarloResult {
  const runs = inputs.runs ?? 10000;
  const seed = inputs.seed ?? 42;
  const months = Math.round(inputs.years * 12);
  const monthlyMean = inputs.expectedReturnPct / 100 / 12;
  const monthlyVol = inputs.volatilityPct / 100 / Math.sqrt(12);

  const jobLossProb = inputs.jobLossProb ?? 0;
  const maintenanceShockProb = inputs.maintenanceShock ?? 0;
  const incomeGrowthPct = inputs.incomeGrowth ?? 0;
  // Heuristic: no dedicated "monthly expenses" input exists yet, so estimate
  // it from the contribution rate (people who save more tend to spend more),
  // floored at $500/mo so low-contribution scenarios don't get a near-zero
  // (and therefore trivially-avoided) distress threshold.
  const monthlyExpenses = inputs.monthlyExpenses ?? Math.max(inputs.monthlyContribution * 2, 500);

  const rng = mulberry32(seed);

  // trajectories[run][year] = balance at end of that year
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

    // Roll this run's annual job-loss / maintenance-shock events up front.
    // Only consumes RNG draws when the corresponding probability is > 0, so
    // callers that omit these params get byte-identical behavior to the
    // pre-upgrade simulation.
    const jobLossYears: boolean[] = [];
    const shockMonthsOfExpenses: number[] = [];
    for (let y = 0; y < yearsCount; y++) {
      jobLossYears.push(jobLossProb > 0 ? rng() < jobLossProb / 100 : false);
      const shockFires = maintenanceShockProb > 0 ? rng() < maintenanceShockProb / 100 : false;
      // Shock size: 1 to 3 months of expenses, drawn deterministically.
      shockMonthsOfExpenses.push(shockFires ? 1 + rng() * 2 : 0);
    }

    for (let m = 1; m <= months; m++) {
      const yearIdx = Math.floor((m - 1) / 12);
      const monthInYear = ((m - 1) % 12) + 1;
      const isJobLossYear = jobLossYears[yearIdx] ?? false;

      const shock = gaussianRandom(rng) * monthlyVol;
      const monthlyReturn = monthlyMean + shock;

      const growthFactor = Math.pow(1 + incomeGrowthPct / 100 / 12, m - 1);
      let contribution = inputs.monthlyContribution * growthFactor;
      // Job-loss year: model 3 months of zero contribution (rather than
      // instantly zeroing the balance) — the first 3 months of the affected
      // simulation-year.
      if (isJobLossYear && monthInYear <= 3) {
        contribution = 0;
      }

      balance = balance * (1 + monthlyReturn) + contribution;
      if (balance < 0) {
        wentNegative = true;
        balance = 0;
      }
      if (balance < monthlyExpenses) {
        wasDistressed = true;
      }

      const isYearEnd = monthInYear === 12 || m === months;
      if (isYearEnd) {
        const shockSize = shockMonthsOfExpenses[yearIdx] ?? 0;
        if (shockSize > 0) {
          balance -= shockSize * monthlyExpenses;
          if (balance < 0) {
            wentNegative = true;
            balance = 0;
          }
          if (balance < monthlyExpenses) {
            wasDistressed = true;
          }
        }
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
    const valuesAtYear = trajectories.map((t) => t[y] ?? t[t.length - 1]).sort((a, b) => a - b);
    bands.push({
      year: y + 1,
      p10: percentile(valuesAtYear, 0.1),
      p50: percentile(valuesAtYear, 0.5),
      p90: percentile(valuesAtYear, 0.9),
    });
  }

  const finalValues = trajectories.map((t) => t[t.length - 1]).sort((a, b) => a - b);

  return {
    bands,
    probabilityOfTarget: inputs.targetAmount != null ? (reachedTarget / runs) * 100 : null,
    finalP10: percentile(finalValues, 0.1),
    finalP50: percentile(finalValues, 0.5),
    finalP90: percentile(finalValues, 0.9),
    survivalRate: (survivedRuns / runs) * 100,
    distressRate: (distressedRuns / runs) * 100,
  };
}

function percentile(sortedValues: number[], p: number): number {
  if (sortedValues.length === 0) return 0;
  const idx = (sortedValues.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedValues[lo];
  const frac = idx - lo;
  return sortedValues[lo] * (1 - frac) + sortedValues[hi] * frac;
}
