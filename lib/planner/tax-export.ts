/**
 * Tax software handoff. No partner API keys.
 * Intuit Tax Import is a closed employer/FI program.
 */

import type { HarvestEvent, HarvestHolding } from "./harvest";

export const TAX_INTEGRATIONS = [
  {
    id: "taxact",
    name: "TaxAct",
    status: "ready" as const,
    path: "Federal → Investment Income → 1099-B CSV import",
    note: "Map Description, Date Sold, Sales Proceeds, Date Acquired, Cost or Other Basis.",
  },
  {
    id: "taxslayer",
    name: "TaxSlayer",
    status: "ready" as const,
    path: "Federal → Investments → Upload a CSV of sales",
    note: "Use their template; headers match the common 1099-B set.",
  },
  {
    id: "turbotax-desktop",
    name: "TurboTax Desktop",
    status: "manual" as const,
    path: "File → Import → Capital gains",
    note: "Desktop can take a spreadsheet. We are not an Intuit partner.",
  },
  {
    id: "turbotax-online",
    name: "TurboTax Online",
    status: "blocked" as const,
    path: "Intuit Tax Import (employers / FIs only)",
    note: "No public 1099-B API for a consumer app.",
  },
  {
    id: "creditkarma",
    name: "Cash App Taxes",
    status: "blocked" as const,
    path: "Broker import only",
    note: "No documented consumer CSV API.",
  },
  {
    id: "taxbit",
    name: "TaxBit",
    status: "partner" as const,
    path: "Enterprise API / CSV / SDK",
    note: "Later partner for crypto + 1099-DA. Needs a commercial agreement.",
  },
  {
    id: "cpa-pack",
    name: "CPA pack",
    status: "ready" as const,
    path: "Weekly report + Form 8949 CSV",
    note: "What a human preparer actually wants this year.",
  },
] as const;

function csvEscape(v: string | number): string {
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function taxActCsv(
  events: HarvestEvent[],
  holdings: HarvestHolding[],
): string {
  const header = [
    "Description",
    "Date Sold",
    "Sales Proceeds",
    "Date Acquired",
    "Cost or Other Basis",
    "Wash Sale",
    "Reported",
  ];
  const rows = events.map((e) => {
    const h = holdings.find((x) => x.symbol === e.symbol);
    const acquired = h?.asOf ?? e.at.slice(0, 10);
    return [
      csvEscape(`${e.shares} sh ${e.symbol}`),
      csvEscape(e.at.slice(0, 10)),
      csvEscape(e.proceeds.toFixed(2)),
      csvEscape(acquired),
      csvEscape((e.proceeds - e.realized).toFixed(2)),
      csvEscape("Review"),
      csvEscape("Not reported to IRS by HōMI"),
    ].join(",");
  });
  return [header.join(","), ...rows].join("\n");
}

export function form8949Csv(events: HarvestEvent[]): string {
  const header = [
    "Description of property",
    "Date acquired",
    "Date sold or disposed",
    "Proceeds",
    "Cost or other basis",
    "Adjustment",
    "Code",
    "Gain or (loss)",
  ];
  const rows = events.map((e) =>
    [
      csvEscape(`${e.shares} sh ${e.symbol}`),
      csvEscape(e.at.slice(0, 10)),
      csvEscape(e.at.slice(0, 10)),
      csvEscape(e.proceeds.toFixed(2)),
      csvEscape((e.proceeds - e.realized).toFixed(2)),
      csvEscape(""),
      csvEscape(""),
      csvEscape(e.realized.toFixed(2)),
    ].join(","),
  );
  return [header.join(","), ...rows].join("\n");
}
