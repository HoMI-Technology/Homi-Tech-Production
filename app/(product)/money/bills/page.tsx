import type { Metadata } from "next";
import { InventChromeEmpty } from "@/components/dashboard/InventChromeEmpty";
import { MoneyShell } from "@/components/money/MoneyShell";

export const metadata: Metadata = {
  title: "Bills",
  description: "Bills wait on connected accounts. Honest empty — no invented amounts.",
  alternates: { canonical: "/money/bills" },
};

/** PR12 invent-chrome shell. Live bills ledger is not on this route yet. */
export default function MoneyBillsPage() {
  return (
    <MoneyShell>
      <InventChromeEmpty
        job="bills"
        eyebrow="Finances · Bills"
        title="Bills"
        body="Accounts aren't connected yet. Bills stay empty until a live ledger lands — no invented amounts."
      />
    </MoneyShell>
  );
}
