import type { Metadata } from "next";
import { TrustPanels } from "./TrustPanels";

export const metadata: Metadata = {
  title: "Trust & Privacy",
  description: "Your data, your control. HōMI's privacy commitments.",
  alternates: { canonical: "/trust" },
};

/** Trust & privacy. Auth is enforced by middleware (protected-routes). */
export default function TrustPage() {
  return <TrustPanels />;
}
