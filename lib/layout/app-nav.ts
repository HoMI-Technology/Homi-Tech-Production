/**
 * Signed-in AppHeader nav destinations. Kept outside the client component so
 * unit/e2e helpers can import without pulling React client boundaries.
 *
 * Derived from the single nav catalog (lib/layout/nav-catalog.ts) so the
 * header and the command palette can never drift — see the parity test in
 * __tests__/layout/nav-catalog-parity.test.ts.
 *
 * PRIMARY stays ruthlessly short so the product bar fits one line with
 * workspace + search + account; Agents appears only when the public feature
 * flag is on (lib/flags.ts → agentOs). Deep routes live under More.
 */

import { HEADER_MORE_NAV, HEADER_PRIMARY_NAV } from "@/lib/layout/nav-catalog";

/** Core operate destinations only — 3 items max (+ Agents when flagged). */
export const APP_PRIMARY_NAV = HEADER_PRIMARY_NAV;

/**
 * Everything else under More. Journal, Companion, finance, and the deeper
 * product surface stay one click away without crowding the bar.
 */
export const APP_MORE_NAV = HEADER_MORE_NAV;
