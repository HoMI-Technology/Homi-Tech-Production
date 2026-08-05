/* ------------------------------------------------------------------ */
/* Bank institution metadata — labels + accent colors for linked       */
/* accounts. Ported from the reference planner institutions.ts (lib    */
/* audit #19: PORT, trivial). Pure module: no store imports.           */
/*                                                                     */
/* The BankInstitution id union is imported from ./types (the planner  */
/* data model owns it) instead of being redeclared.                    */
/*                                                                     */
/* The `accent` map below is the ONE place raw third-party bank brand  */
/* hexes may appear: factual brand-identity metadata, not HōMI         */
/* palette tokens. Never reference these for verdict/gauge colors —    */
/* that palette lives in TEMP_HEX.                                     */
/* ------------------------------------------------------------------ */

import type { BankInstitution } from './types'

export type { BankInstitution }

export interface InstitutionMeta {
  id: BankInstitution
  label: string
  short: string
  accent: string
}

export const INSTITUTIONS: InstitutionMeta[] = [
  { id: 'chase', label: 'Chase', short: 'CH', accent: '#22d3ee' },
  { id: 'bofa', label: 'Bank of America', short: 'BA', accent: '#e11d48' },
  { id: 'wells', label: 'Wells Fargo', short: 'WF', accent: '#facc15' },
  { id: 'capitalone', label: 'Capital One', short: 'C1', accent: '#f24822' },
  { id: 'ally', label: 'Ally Bank', short: 'AL', accent: '#22d3ee' },
  { id: 'other', label: 'Other bank', short: 'BK', accent: '#94a3b8' },
]

export function institutionLabel(id: BankInstitution): string {
  return INSTITUTIONS.find((i) => i.id === id)?.label ?? id
}

export function institutionMeta(id: BankInstitution): InstitutionMeta {
  return INSTITUTIONS.find((i) => i.id === id) ?? INSTITUTIONS[INSTITUTIONS.length - 1]!
}
