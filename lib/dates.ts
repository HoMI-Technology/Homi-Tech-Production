/**
 * Calendar-date helpers that stay in the user's local timezone.
 *
 * Never use `new Date().toISOString().slice(0, 10)` for a "today" date field —
 * that yields the UTC calendar day, which is yesterday (or tomorrow) for anyone
 * west (or east) of UTC near midnight. Never feed a bare `YYYY-MM-DD` string to
 * `new Date(...)` for display either — ES parses that as UTC midnight, so
 * `toLocaleDateString()` shifts it back a day in US timezones.
 */

/** Local calendar day as `YYYY-MM-DD`. */
export function localDateISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Parse a `YYYY-MM-DD` (or full ISO timestamp) as a local calendar Date at
 * local midnight. Returns null when the string is missing or malformed.
 */
export function parseLocalDateISO(value: string | null | undefined): Date | null {
  if (!value) return null;
  const dayPart = value.slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayPart);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null;
  }
  return date;
}

/** Format a stored `YYYY-MM-DD` for display in the user's locale. */
export function formatLocalDateISO(
  value: string | null | undefined,
  locales?: string | string[],
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = parseLocalDateISO(value);
  if (!date) return value ?? "";
  return date.toLocaleDateString(locales, options);
}
