import type { Metadata } from "next";
import { FullAssessmentFlow } from "@/components/assessment/FullAssessmentFlow";

export const metadata: Metadata = {
  title: "The Full Assessment",
  description: "A calm, honest walk through Financial Reality, Emotional Truth, and Perfect Timing — your full HōMI-Score.",
  alternates: { canonical: "/assessment" },
};

export default function AssessmentPage() {
  return <FullAssessmentFlow />;
}
