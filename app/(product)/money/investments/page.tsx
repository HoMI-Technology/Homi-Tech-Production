import type { Metadata } from "next";
import { MoneyShell } from "@/components/money/MoneyShell";
import { InvestmentsSurface } from "./InvestmentsSurface";

export const metadata: Metadata = {
  title: "Investments",
  description: "Track your investment holdings — educational guidance only.",
  alternates: { canonical: "/money/investments" },
};

/**
 * Money Reality — Invest mode. MoneyShell owns the chrome; InvestmentsSurface
 * owns the client boundary (planner-store hydration + the portfolio panel).
 */
export default function MoneyInvestmentsPage() {
  return (
    <MoneyShell>
      <InvestmentsSurface />
    </MoneyShell>
  );
}
