import { permanentRedirect } from "next/navigation";

/**
 * Deep-link alias: there is no standalone /readiness route — the canonical
 * readiness surface is /path (Path to Ready). Same permanentRedirect pattern
 * as app/(marketing)/blog/page.tsx, so bookmarks and shared links keep working.
 */
export default function ReadinessRedirectPage() {
  permanentRedirect("/path");
}
