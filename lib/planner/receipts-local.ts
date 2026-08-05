/**
 * Local educational receipt export for planner Overview / Plan Share.
 * Not a B2B signed receipt (see lib/receipts for partner verification).
 */

import type { VerdictKey } from "@/lib/brand";
import { VERDICT_META } from "@/lib/brand";

export interface LocalReceipt {
  token: string;
  score: number;
  verdict: VerdictKey;
  issuedAt: string;
  summary: string;
}

export function issueReceipt(input: {
  score: number;
  verdict: VerdictKey;
  netWorth?: number;
  runwayLabel?: string;
}): LocalReceipt {
  const issuedAt = new Date().toISOString();
  const band = VERDICT_META[input.verdict]?.label ?? input.verdict;
  const token = `homi_rcpt_${input.verdict.toLowerCase()}_${Math.round(input.score)}_${issuedAt.slice(0, 10).replace(/-/g, "")}`;
  return {
    token,
    score: input.score,
    verdict: input.verdict,
    issuedAt,
    summary: `HōMI readiness · ${band} · score ${input.score.toFixed(0)} · educational only`,
  };
}

export function downloadReceipt(receipt: LocalReceipt): void {
  if (typeof window === "undefined") return;
  const blob = new Blob(
    [
      JSON.stringify(
        {
          ...receipt,
          disclaimer:
            "Educational guidance only — not financial, legal, tax, or investment advice. Band-only receipt · no underlying financials.",
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${receipt.token}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function copyReceiptSummary(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  return Promise.resolve();
}
