import type { Metadata } from "next";
import { MoneyShell } from "@/components/money/MoneyShell";
import { MoneyDecideHub } from "@/components/money/MoneyDecideHub";

export const metadata: Metadata = {
  title: "Decide · Money",
  description:
    "Decision lenses on your HōMI money picture — housing, stability, horizon, readiness.",
  alternates: { canonical: "/money/decide" },
};

/**
 * Money · Decide — job-grouped lens hub (unifies former /tools primary home).
 */
export default function MoneyDecidePage() {
  return (
    <MoneyShell>
      <MoneyDecideHub />
    </MoneyShell>
  );
}
