import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Mortgage Payment",
  description: "Folded into Affordability — payment math lives on that lens.",
  alternates: { canonical: "/tools/affordability" },
};

/**
 * Mortgage Payment is folded into Affordability (TOOL_CONSOLIDATION, 14 Aug 2026).
 * Deep links and the legacy /tools/mortgage-payment alias still resolve here,
 * then 308 onto the hub lens. Do not delete this route file.
 */
export default function MortgagePaymentFold() {
  permanentRedirect("/tools/affordability");
}
