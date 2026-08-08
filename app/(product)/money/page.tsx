import type { Metadata } from "next";
import { MoneyShell } from "@/components/money/MoneyShell";
import { MoneyStand } from "@/components/money/MoneyStand";

export const metadata: Metadata = {
  title: "Money",
  description:
    "Your HōMI money picture — free cash, runway, goals, and decision math in one place.",
  alternates: { canonical: "/money" },
};

/**
 * Money Reality — Stand mode (canonical money home).
 * Replaces the dual /finance + /tools chrome split.
 */
export default function MoneyPage() {
  return (
    <MoneyShell>
      <MoneyStand />
    </MoneyShell>
  );
}
