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
 * flag is on (lib/flags.ts → agentOs). Money is More / palette (depth),
 * not a peer home. Deep routes live under More.
 */

import { HEADER_MORE_NAV, HEADER_PRIMARY_NAV } from "@/lib/layout/nav-catalog";
import { LEFT_RAIL_PRIMARY, LEFT_RAIL_SECONDARY } from "@/lib/layout/left-rail";

/** Core operate destinations only — 3 items max (+ Agents when flagged). */
export const APP_PRIMARY_NAV = HEADER_PRIMARY_NAV;

/** PR10 personal left rail. Quiet HEADER_* catalogs stay for role-tree chrome. */
export const APP_RAIL_PRIMARY = LEFT_RAIL_PRIMARY;
export const APP_RAIL_SECONDARY = LEFT_RAIL_SECONDARY;

/**
 * Everything else under More. Journal, finance, and the deeper
 * product surface stay one click away without crowding the bar.
 */
export const APP_MORE_NAV = HEADER_MORE_NAV;
