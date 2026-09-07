import type { Metadata } from "next";
import { MoneyShell } from "@/components/money/MoneyShell";
import { MoneyStand } from "@/components/money/MoneyStand";

export const metadata: Metadata = {
  title: "Money",
  description:
    "Where cash sits — liquid, runway, and ledger flags. Educational only. Facts under the verdict.",
  alternates: { canonical: "/money" },
};

/**
 * Money Reality — Stand job on live `/money` (canonical money depth, not a
 * second Path home and not a score hero). Score stays AssessmentResult on Home.
 */
export default function MoneyPage() {
  return (
    <MoneyShell>
      <MoneyStand />
    </MoneyShell>
  );
}
