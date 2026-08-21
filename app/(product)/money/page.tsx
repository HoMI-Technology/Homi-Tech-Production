import type { Metadata } from "next";
import { MoneyShell } from "@/components/money/MoneyShell";
import { MoneyStand } from "@/components/money/MoneyStand";

export const metadata: Metadata = {
  title: "Money",
  description:
    "Where cash sits — surplus, runway, and liquid. Educational only. Decision math is one click deeper.",
  alternates: { canonical: "/money" },
};

/**
 * Money Reality — Stand mode (canonical money depth, not a second Path home).
 * Replaces the dual /finance + /tools chrome split.
 */
export default function MoneyPage() {
  return (
    <MoneyShell>
      <MoneyStand />
    </MoneyShell>
  );
}
