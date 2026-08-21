import type { Metadata } from "next";
import { MoneyShell } from "@/components/money/MoneyShell";
import { MoneyDecideHub } from "@/components/money/MoneyDecideHub";

export const metadata: Metadata = {
  title: "Decide · Money",
  description:
    "Answer one math question on your money picture — educational lenses only, not advice.",
  alternates: { canonical: "/money/decide" },
};

/**
 * Money · Decide — one active lens at a time (depth workbench, not a second home).
 */
export default function MoneyDecidePage() {
  return (
    <MoneyShell>
      <MoneyDecideHub />
    </MoneyShell>
  );
}
