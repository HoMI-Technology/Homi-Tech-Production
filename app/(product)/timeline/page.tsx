import type { Metadata } from "next";
import { TimelineView } from "./TimelineView";

export const metadata: Metadata = {
  title: "Score History",
  description: "Track how your readiness score has changed over time.",
  alternates: { canonical: "/timeline" },
};

/** Readiness timeline. Auth is enforced by middleware (protected-routes). */
export default function TimelinePage() {
  return <TimelineView />;
}
