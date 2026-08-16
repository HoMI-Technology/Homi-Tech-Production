import type { BankInstitution } from "./types";

export const INSTITUTIONS: {
  id: BankInstitution;
  label: string;
  short: string;
  accent: string;
}[] = [
  { id: "chase", label: "Chase", short: "CH", accent: "#22d3ee" },
  { id: "bofa", label: "Bank of America", short: "BA", accent: "#e11d48" },
  { id: "wells", label: "Wells Fargo", short: "WF", accent: "#facc15" },
  { id: "capitalone", label: "Capital One", short: "C1", accent: "#ef4444" },
  { id: "ally", label: "Ally Bank", short: "AL", accent: "#7c3aed" },
  { id: "other", label: "Other bank", short: "BK", accent: "#94a3b8" },
];

export function institutionLabel(id: BankInstitution): string {
  return INSTITUTIONS.find((i) => i.id === id)?.label ?? id;
}

export function institutionMeta(id: BankInstitution) {
  return INSTITUTIONS.find((i) => i.id === id) ?? INSTITUTIONS[INSTITUTIONS.length - 1]!;
}
