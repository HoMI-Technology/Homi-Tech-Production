import type { Metadata } from "next";
import { MoneyShell } from "@/components/money/MoneyShell";
import { GoalsSurface } from "./GoalsSurface";

export const metadata: Metadata = {
  title: "Goals",
  description: "Track your savings goals — down payment, emergency fund, and more.",
  alternates: { canonical: "/money/goals" },
};

/**
 * Money Reality — Goals mode. MoneyShell owns the chrome; GoalsSurface owns the
 * client boundary (server sync + the goals command).
 */
export default function MoneyGoalsPage() {
  return (
    <MoneyShell>
      <GoalsSurface />
    </MoneyShell>
  );
}
