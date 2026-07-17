import type { Metadata } from "next";
import { ShadowScoreFlow } from "@/components/assessment/ShadowScoreFlow";

export const metadata: Metadata = {
  title: "Shadow Score — The 90-Second Read",
  description: "Six quick questions. A fast, honest read on your readiness — fill in the full picture any time with the complete assessment.",
  alternates: { canonical: "/shadow-score" },
};

export default function ShadowScorePage() {
  return <ShadowScoreFlow />;
}
