/* ------------------------------------------------------------------ */
/* Canonical Financial Model (CFM) — source-labeled view of planner    */
/* numbers. Ported from the reference planner cfm.ts (lib audit #16:   */
/* PORT, adapted).                                                     */
/*                                                                     */
/* ONE mandated adaptation (audit §2.4 — canon honesty contract):      */
/* the reference imputed horizon defaults (`expectedReturnPct ?? 7`,   */
/* `volatilityPct ?? 12`) and labeled the guess "derived". Canon:      */
/* horizon return/volatility are strictly self-reported — missing is   */
/* a first-class signal, never imputed. Here they resolve "missing"    */
/* unless the user actually supplied them. The 4th FieldSource         */
/* "derived" stays for genuinely computed values.                      */
/* ------------------------------------------------------------------ */

export type FieldSource = 'self-reported' | 'lens-derived' | 'derived' | 'missing'

export interface SourcedNumber {
  value: number
  source: FieldSource
}

export interface ToolsOverlay {
  targetPrice?: number
  downPaymentSaved?: number
  currentRent?: number
  assumedRatePct?: number
  termYears?: number
  taxInsuranceRatePct?: number
  hoaMonthly?: number
  homeValue?: number
  currentMortgageBalance?: number
  currentMortgageRatePct?: number
  investedAssets?: number
  annualContribution?: number
  extraDebtPayment?: number
}

export interface CfmCoreInput {
  monthlyIncome: number
  monthlyExpenses: number
  monthlyDebtPayments: number
  liquidSavings: number
  totalDebt: number
  portfolioValue: number
  netCashFlow: number
  savingsRatePct: number
  runwayMonths: number
  dtiPct: number
  expectedReturnPct?: number
  volatilityPct?: number
}

export interface CanonicalFinancialModel {
  core: {
    monthlyIncome: SourcedNumber
    monthlyExpenses: SourcedNumber
    monthlyDebtPayments: SourcedNumber
    liquidSavings: SourcedNumber
    totalDebt: SourcedNumber
  }
  housing: {
    targetPrice: SourcedNumber
    downPaymentSaved: SourcedNumber
    currentRent: SourcedNumber
    assumedRatePct: SourcedNumber
    termYears: SourcedNumber
    taxInsuranceRatePct: SourcedNumber
    hoaMonthly: SourcedNumber
  }
  horizon: {
    investedAssets: SourcedNumber
    annualContribution: SourcedNumber
    expectedReturnPct: SourcedNumber
    volatilityPct: SourcedNumber
  }
  derived: {
    netCashFlow: number
    savingsRatePct: number
    runwayMonths: number
    dtiPct: number
  }
  meta: {
    real: boolean
    savedAt: string | null
  }
}

function sourced(value: number | undefined, source: FieldSource): SourcedNumber {
  if (value === undefined || !Number.isFinite(value)) {
    return { value: 0, source: 'missing' }
  }
  return { value, source }
}

function overlayField(value: number | undefined): SourcedNumber {
  return sourced(value, 'lens-derived')
}

export function deriveCfm(
  finance: CfmCoreInput,
  overlay: ToolsOverlay,
  savedAt: string | null,
  real = true,
): CanonicalFinancialModel {
  return {
    core: {
      monthlyIncome: sourced(finance.monthlyIncome, 'self-reported'),
      monthlyExpenses: sourced(finance.monthlyExpenses, 'self-reported'),
      monthlyDebtPayments: sourced(finance.monthlyDebtPayments, 'self-reported'),
      liquidSavings: sourced(finance.liquidSavings, 'self-reported'),
      totalDebt: sourced(finance.totalDebt, 'self-reported'),
    },
    housing: {
      targetPrice: overlayField(overlay.targetPrice),
      downPaymentSaved: overlayField(overlay.downPaymentSaved),
      currentRent: overlayField(overlay.currentRent),
      assumedRatePct: overlayField(overlay.assumedRatePct),
      termYears: overlayField(overlay.termYears),
      taxInsuranceRatePct: overlayField(overlay.taxInsuranceRatePct),
      hoaMonthly: overlayField(overlay.hoaMonthly),
    },
    horizon: {
      investedAssets: overlayField(
        overlay.investedAssets ??
          (finance.portfolioValue > 0 ? finance.portfolioValue : undefined),
      ),
      annualContribution: overlayField(
        overlay.annualContribution ??
          (finance.netCashFlow > 0
            ? Math.round(finance.netCashFlow * 12)
            : undefined),
      ),
      // Canon honesty contract (audit §2.4): strictly self-reported.
      // The reference imputed 7% / 12% — missing is a signal, not a guess.
      expectedReturnPct: sourced(finance.expectedReturnPct, 'self-reported'),
      volatilityPct: sourced(finance.volatilityPct, 'self-reported'),
    },
    derived: {
      netCashFlow: finance.netCashFlow,
      savingsRatePct: finance.savingsRatePct,
      runwayMonths: finance.runwayMonths,
      dtiPct: finance.dtiPct,
    },
    meta: { real, savedAt },
  }
}

export function resolveCfmValue(
  cfm: CanonicalFinancialModel,
  path: string,
): SourcedNumber {
  const [group, key] = path.split('.')
  const bucket =
    group === 'core'
      ? cfm.core
      : group === 'housing'
        ? cfm.housing
        : group === 'horizon'
          ? cfm.horizon
          : null
  if (!bucket || !key) return { value: 0, source: 'missing' }
  const field = (bucket as Record<string, SourcedNumber>)[key]
  return field ?? { value: 0, source: 'missing' }
}

export function cfmCoverage(
  cfm: CanonicalFinancialModel,
  paths: string[],
): number {
  if (paths.length === 0) return 0
  const present = paths.filter(
    (p) => resolveCfmValue(cfm, p).source !== 'missing',
  ).length
  return present / paths.length
}

/** Rough PITI estimate for housing-ratio hard-stop / CFM. */
export function estimateHousingPayment(params: {
  targetPrice: number
  downPaymentSaved: number
  ratePct: number
  termYears: number
  taxInsuranceRatePct: number
  hoaMonthly: number
}): number {
  const principal = Math.max(0, params.targetPrice - params.downPaymentSaved)
  const r = params.ratePct / 100 / 12
  const n = params.termYears * 12
  let piti = 0
  if (principal > 0 && r > 0 && n > 0) {
    piti = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  } else if (principal > 0 && n > 0) {
    piti = principal / n
  }
  const taxIns = (params.targetPrice * (params.taxInsuranceRatePct / 100)) / 12
  return piti + taxIns + params.hoaMonthly
}

export const SOURCE_LABEL: Record<FieldSource, string> = {
  'self-reported': 'Ledger',
  'lens-derived': 'Lens',
  derived: 'Derived',
  missing: 'Missing',
}
