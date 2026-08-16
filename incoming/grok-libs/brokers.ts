/**
 * Broker institutions. Manual holdings until investment feeds connect.
 */

import type { Holding } from "./types";

export type BrokerInstitution =
  | "fidelity"
  | "vanguard"
  | "schwab"
  | "etrade"
  | "robinhood"
  | "other";

export interface BrokerMeta {
  id: BrokerInstitution;
  label: string;
  short: string;
  color: string;
}

export const BROKERS: BrokerMeta[] = [
  { id: "fidelity", label: "Fidelity", short: "FID", color: "#4caf50" },
  { id: "vanguard", label: "Vanguard", short: "VG", color: "#c41230" },
  { id: "schwab", label: "Charles Schwab", short: "SCH", color: "#00a0df" },
  { id: "etrade", label: "E*TRADE", short: "ET", color: "#6633cc" },
  { id: "robinhood", label: "Robinhood", short: "RH", color: "#00c805" },
  { id: "other", label: "Other broker", short: "BRK", color: "#94a3b8" },
];

export function brokerMeta(id: BrokerInstitution): BrokerMeta {
  return BROKERS.find((b) => b.id === id) ?? BROKERS[BROKERS.length - 1]!;
}
