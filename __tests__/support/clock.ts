/**
 * Frozen-clock helper for deterministic T0/T1 tests.
 * Restore in afterEach — never leave a fake timer running across files.
 */

export const FROZEN_ISO = "2026-08-22T12:00:00.000Z";

export function freezeClock(iso: string = FROZEN_ISO): Date {
  return new Date(iso);
}
