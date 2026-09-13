import type { Metadata } from "next";
import { InventChromeEmpty } from "@/components/dashboard/InventChromeEmpty";
import { JobDepthFrame } from "@/components/layout/JobDepthFrame";

export const metadata: Metadata = {
  title: "Emergency Fund",
  description: "Emergency fund waits on connected accounts. Honest empty — no invented amounts.",
  alternates: { canonical: "/tools/emergency-fund" },
};

/**
 * PR13 invent-chrome tool shell. Distinct from the live /tools/runway calculator.
 * No invent $.
 */
export default function EmergencyFundChromePage() {
  return (
    <JobDepthFrame job="tools" width="catalog">
      <InventChromeEmpty
        job="emergency-fund"
        eyebrow="Tools · chrome shell"
        title="Emergency Fund"
        body="Accounts aren't connected yet. This shell does not invent a fund target or a dollar amount."
      />
    </JobDepthFrame>
  );
}
