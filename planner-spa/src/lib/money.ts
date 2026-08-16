/**
 * Money primitives — integer-cents bridge for ledger math.
 *
 * The budget store speaks in floating dollars at its boundaries (seed data,
 * user input, display). These helpers are the only sanctioned conversion
 * point so rounding happens in exactly one place: convert to integer cents
 * at the boundary, do the math in cents, convert back only for display.
 * Ported from HōMI canon lib/finance/money.ts, adapted to this repo's
 * dollar-based selectors (which are left untouched).
 */

/** Integer cents. 650000 = $6,500.00. Always a safe integer. */
export type MoneyCents = number

/** Upper bound for a single amount: $100,000,000.00 in cents. */
export const MAX_MONEY_CENTS = 10_000_000_000

/** True when the value is usable as stored cents (integer, safe, in range). */
export function isValidCents(value: number): value is MoneyCents {
  return Number.isSafeInteger(value) && Math.abs(value) <= MAX_MONEY_CENTS
}

/**
 * Converts a dollar amount (possibly fractional) to integer cents with
 * half-up rounding. Throws on non-finite input rather than storing NaN.
 */
export function dollarsToCents(dollars: number): MoneyCents {
  if (!Number.isFinite(dollars)) {
    throw new RangeError(`Cannot convert non-finite dollars to cents: ${dollars}`)
  }
  const cents = Math.round(dollars * 100)
  if (!isValidCents(cents)) {
    throw new RangeError(`Dollar amount out of range: ${dollars}`)
  }
  return cents
}

/** Converts cents back to a dollar number for display math only. */
export function centsToDollars(cents: MoneyCents): number {
  return cents / 100
}

/**
 * Sums cents with an integrity check — a single corrupted float in a list
 * should fail loudly here, not silently produce a fractional total.
 */
export function sumCents(values: readonly MoneyCents[]): MoneyCents {
  let total = 0
  for (const value of values) {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(`Non-integer cents in sum: ${value}`)
    }
    total += value
  }
  if (!Number.isSafeInteger(total)) {
    throw new RangeError('Cents sum exceeded safe-integer range')
  }
  return total
}
