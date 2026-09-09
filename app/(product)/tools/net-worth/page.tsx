import type { Metadata } from "next";
import { InventChromeEmpty } from "@/components/dashboard/InventChromeEmpty";
import { JobDepthFrame } from "@/components/layout/JobDepthFrame";

export const metadata: Metadata = {
  title: "Net Worth",
  description: "Net worth waits on connected accounts. Honest empty — no invented amounts.",
  alternates: { canonical: "/tools/net-worth" },
};

/** PR13 invent-chrome tool shell. Not a hub calculator. No invent $. */
export default function NetWorthChromePage() {
  return (
    <JobDepthFrame job="tools" width="catalog">
      <InventChromeEmpty
        job="net-worth"
        eyebrow="Tools · chrome shell"
        title="Net Worth"
        body="Accounts aren't connected yet. Net worth stays empty until a live ledger lands — no invented amounts."
      />
    </JobDepthFrame>
  );
}
