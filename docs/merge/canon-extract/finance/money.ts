/**
 * Budget & Runway — money primitives (PR 1: domain foundation).
 *
 * All ledger amounts are integer cents. The legacy finance snapshot
 * (lib/finance/store.ts) speaks in floating dollars; these helpers are the
 * only sanctioned bridge between the two representations so rounding
 * happens in exactly one place. Floating-point dollars never enter a
 * calculation — they are converted at the boundary and back only for
 * display.
 */

/** Integer cents. 650000 = $6,500.00. Always a safe integer. */
export type MoneyCents = number;

/**
 * Upper bound for a single stored amount: $100,000,000.00 in cents.
 * Matches the Zod schema ceiling so client and server reject the same
 * inputs.
 */
export const MAX_MONEY_CENTS = 10_000_000_000;

/** True when the value is usable as stored cents (integer, safe, in range). */
export function isValidCents(value: number): value is MoneyCents {
  return (
    Number.isSafeInteger(value) &&
    Math.abs(value) <= MAX_MONEY_CENTS
  );
}

/**
 * Converts a dollar amount (possibly fractional, possibly the legacy
 * snapshot's floats) to integer cents with half-up rounding. Throws on
 * non-finite input rather than storing NaN in a ledger.
 */
export function dollarsToCents(dollars: number): MoneyCents {
  if (!Number.isFinite(dollars)) {
    throw new RangeError(`Cannot convert non-finite dollars to cents: ${dollars}`);
  }
  const cents = Math.round(dollars * 100);
  if (!isValidCents(cents)) {
    throw new RangeError(`Dollar amount out of range: ${dollars}`);
  }
  return cents;
}

/** Converts stored cents back to a dollar number for display math only. */
export function centsToDollars(cents: MoneyCents): number {
  return cents / 100;
}

/**
 * Sums cents with an integrity check — a single corrupted float in a list
 * should fail loudly, not silently produce a fractional total.
 */
export function sumCents(values: readonly MoneyCents[]): MoneyCents {
  let total = 0;
  for (const value of values) {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(`Non-integer cents in sum: ${value}`);
    }
    total += value;
  }
  if (!Number.isSafeInteger(total)) {
    throw new RangeError("Cents sum exceeded safe-integer range");
  }
  return total;
}

/**
 * Formats cents as USD for copy ("$6,500" or "$146.32"). Whole-dollar
 * amounts drop the cents by default because the Budget & Runway summary
 * cards use large whole numerals; pass `alwaysCents` for tabular rows.
 */
export function formatCentsUSD(
  cents: MoneyCents,
  options: { alwaysCents?: boolean } = {},
): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const wholeDollars = abs % 100 === 0 && !options.alwaysCents;
  const formatted = (abs / 100).toLocaleString("en-US", {
    minimumFractionDigits: wholeDollars ? 0 : 2,
    maximumFractionDigits: wholeDollars ? 0 : 2,
  });
  return `${negative ? "−" : ""}$${formatted}`;
}
