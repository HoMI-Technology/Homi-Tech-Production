import type { Metadata } from "next";
import { ShadowScoreFlow } from "@/components/assessment/ShadowScoreFlow";
import { SHADOW_READ_KICKER, SHADOW_READ_TITLE } from "@/lib/assessment/shadow-read";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: SHADOW_READ_TITLE,
  description: SHADOW_READ_KICKER,
  path: "/shadow-score",
});

export default function ShadowScorePage() {
  return <ShadowScoreFlow />;
}
