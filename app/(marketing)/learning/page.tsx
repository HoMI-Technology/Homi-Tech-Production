import { permanentRedirect } from "next/navigation";

/**
 * Content hub consolidation (D5): /guides is THE hub. The learning index
 * folded into /guides ("Learning" section); individual articles still render
 * at /learning/[slug], so deep links keep working.
 */
export default function LearningHubPage() {
  permanentRedirect("/guides");
}
