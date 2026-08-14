import type { Metadata } from "next";
import { ShadowScoreFlow } from "@/components/assessment/ShadowScoreFlow";
import { SHADOW_READ_KICKER, SHADOW_READ_TITLE } from "@/lib/assessment/shadow-read";

export const metadata: Metadata = {
  title: SHADOW_READ_TITLE,
  description: SHADOW_READ_KICKER,
  alternates: { canonical: "/shadow-score" },
};

export default function ShadowScorePage() {
  return <ShadowScoreFlow />;
}
