import type { Holding } from '@/store/budget'
import { CATEGORY_PALETTE } from '@/store/budget'

/* ------------------------------------------------------------------ */
/* Deterministic pseudo-random helpers (simulated market data)         */
/* ------------------------------------------------------------------ */

export function mulberry32(a: number): () => number {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashStr(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

export const round2 = (v: number) => Math.round(v * 100) / 100

/* ------------------------------------------------------------------ */
/* Per-ticker character                                                */
/* ------------------------------------------------------------------ */

const KNOWN_VOL: Record<string, number> = {
  VTI: 0.012,
  AAPL: 0.02,
  MSFT: 0.016,
  NVDA: 0.035,
  SCHD: 0.008,
  BTC: 0.045,
  ETH: 0.05,
  SOL: 0.06,
  HYSA: 0,
}

/** Daily volatility for the simulated random walk. */
export function tickerVol(ticker: string): number {
  const t = ticker.toUpperCase()
  if (t in KNOWN_VOL) return KNOWN_VOL[t]
  return 0.01 + (hashStr(t) % 22) / 1000 // 0.010 – 0.031, stable per ticker
}

const KNOWN_COLORS: Record<string, string> = {
  VTI: '#60a5fa', // blue
  AAPL: '#22d3ee', // cyan
  MSFT: '#a78bfa', // violet
  NVDA: '#34d399', // emerald
  SCHD: '#fab633', // amber
  BTC: '#fb923c', // orange
  HYSA: '#64748b', // dim slate
}

/** Donut / row-edge color for a holding. */
export function tickerColor(ticker: string, index: number): string {
  const t = ticker.toUpperCase()
  if (t in KNOWN_COLORS) return KNOWN_COLORS[t]
  return CATEGORY_PALETTE[(hashStr(t) + index) % CATEGORY_PALETTE.length]
}

export const CASH_TICKERS = new Set(['HYSA', 'CASH', 'SPAXX', 'VMFXX', 'MMA'])
export const CRYPTO_TICKERS = new Set(['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'ADA'])

export type AssetClass = 'equity' | 'crypto' | 'cash'
export function assetClass(ticker: string): AssetClass {
  const t = ticker.toUpperCase()
  if (CASH_TICKERS.has(t)) return 'cash'
  if (CRYPTO_TICKERS.has(t)) return 'crypto'
  return 'equity'
}

export const isCashHolding = (h: Holding) => assetClass(h.ticker) === 'cash'

/* ------------------------------------------------------------------ */
/* History generation / extension                                      */
/* ------------------------------------------------------------------ */

/**
 * 30-day closing history ending at `price` (seeded backward random walk).
 * Mirrors the seed generator in the store — used for newly added holdings.
 */
export function genHistory(price: number, vol: number, seed: number, days = 30): number[] {
  const r = mulberry32(seed)
  const out = new Array<number>(days)
  out[days - 1] = round2(price)
  for (let i = days - 2; i >= 0; i--) {
    const step = (r() - 0.48) * vol
    out[i] = round2(out[i + 1] / (1 + step))
  }
  return out
}

/** Extend a holding's 30-day history backward to `totalDays`, deterministically. */
export function extendHistory(h: Holding, totalDays: number, vol: number): number[] {
  const hist = h.history.length > 0 ? h.history : [h.price]
  if (totalDays <= hist.length) return hist.slice(hist.length - totalDays)
  const extra = totalDays - hist.length
  const r = mulberry32(hashStr(h.ticker) + totalDays * 131)
  const back = new Array<number>(extra)
  let cur = hist[0]
  for (let i = extra - 1; i >= 0; i--) {
    const step = (r() - 0.47) * vol * 1.15
    cur = cur / (1 + step)
    back[i] = cur
  }
  return [...back, ...hist]
}

/* ------------------------------------------------------------------ */
/* Ranges                                                              */
/* ------------------------------------------------------------------ */

export type RangeKey = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'

export const RANGES: { key: RangeKey; label: string; days: number }[] = [
  { key: '1W', label: '1W', days: 7 },
  { key: '1M', label: '1M', days: 30 },
  { key: '3M', label: '3M', days: 90 },
  { key: '6M', label: '6M', days: 182 },
  { key: '1Y', label: '1Y', days: 365 },
  { key: 'ALL', label: 'ALL', days: 730 },
]

export function rangeDays(key: RangeKey): number {
  return RANGES.find((r) => r.key === key)?.days ?? 30
}

/** Dates oldest → newest, ending today. */
export function seriesDates(n: number): Date[] {
  const today = new Date()
  const out: Date[] = []
  for (let i = 0; i < n; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1 - i))
    out.push(d)
  }
  return out
}

export function tickFormat(range: RangeKey): (d: Date) => string {
  if (range === '1W') return (d) => d.toLocaleDateString('en-US', { weekday: 'short' })
  if (range === '1Y' || range === 'ALL')
    return (d) => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  return (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function fullDateLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

/** Aggregated portfolio value series (position value = shares × price) for a range. */
export function portfolioSeries(holdings: Holding[], days: number): number[] {
  const out = new Array<number>(days).fill(0)
  for (const h of holdings) {
    const prices = extendHistory(h, days, tickerVol(h.ticker))
    for (let i = 0; i < days; i++) out[i] += h.shares * prices[i]
  }
  return out.map(round2)
}

/** Single-position value series for a range. */
export function holdingSeries(h: Holding, days: number): number[] {
  return extendHistory(h, days, tickerVol(h.ticker)).map((p) => round2(h.shares * p))
}
