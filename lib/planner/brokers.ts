/* ------------------------------------------------------------------ */
/* Broker institution metadata — manual holdings until investment      */
/* feeds connect. Ported from the reference planner brokers.ts (lib    */
/* audit #18: PORT, trivial). Pure module: no store imports.           */
/*                                                                     */
/* The BrokerInstitution id union is imported from ./types (the        */
/* planner data model owns it) instead of being redeclared.            */
/*                                                                     */
/* The `color` map below is the ONE place raw third-party broker       */
/* brand hexes may appear: factual brand-identity metadata (Fidelity   */
/* green, Schwab blue, …), not HōMI palette tokens. Never reference    */
/* these for verdict/gauge colors — that palette lives in TEMP_HEX.    */
/* ------------------------------------------------------------------ */

import type { BrokerInstitution } from './types'

export type { BrokerInstitution }

export interface BrokerMeta {
  id: BrokerInstitution
  label: string
  short: string
  color: string
}

export const BROKERS: BrokerMeta[] = [
  { id: 'fidelity', label: 'Fidelity', short: 'FID', color: '#4caf50' },
  { id: 'vanguard', label: 'Vanguard', short: 'VG', color: '#c41230' },
  { id: 'schwab', label: 'Charles Schwab', short: 'SCH', color: '#00a0df' },
  { id: 'etrade', label: 'E*TRADE', short: 'ET', color: '#6633cc' },
  { id: 'robinhood', label: 'Robinhood', short: 'RH', color: '#00c805' },
  { id: 'other', label: 'Other broker', short: 'BRK', color: '#94a3b8' },
]

export function brokerMeta(id: BrokerInstitution): BrokerMeta {
  return BROKERS.find((b) => b.id === id) ?? BROKERS[BROKERS.length - 1]!
}
