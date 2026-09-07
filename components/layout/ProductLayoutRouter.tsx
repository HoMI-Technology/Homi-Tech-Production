"use client";

import { usePathname } from "next/navigation";
import { AssessmentShell } from "@/components/assessment/AssessmentShell";
import { AppHeader } from "@/components/layout/AppHeader";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * Chrome selector for the (product) group. app/(product)/layout.tsx reads the
 * session server-side but cannot know the pathname, so the shell decision lands
 * here — the thinnest possible client component, holding no state of its own.
 *
 * Three shells:
 *   - anonymous              → marketing SiteHeader (public tools, shadow score)
 *   - signed in              → SHELL_CRAFT v3 quiet top bar (AppHeader) + main#main
 *   - signed in, /assessment → AssessmentShell, full-bleed, no product chrome
 *
 * The assessment branch drops the atmospheric aurora/noise layers along with
 * the bar: focus mode means nothing on screen competes with the question.
 * Every branch renders exactly one `main#main` (AssessmentShell provides its
 * own) so the layout's skip link always has a target.
 *
 * Signed-in chrome is a quiet top bar only — no left rail, no Jump slab,
 * no mobile bottom tab bar. Depth lives behind ··· (live routes).
 */
export function ProductLayoutRouter({
  children,
  user,
  email,
  role,
  employerId,
  organizationId,
}: {
  children: React.ReactNode;
  /** true = authenticated. The session itself never crosses to the client. */
  user: boolean;
  email: string | null;
  role?: string | null;
  employerId?: string | null;
  organizationId?: string | null;
}) {
  const pathname = usePathname();

  if (!user) {
    return (
      <>
        <div aria-hidden className="app-aurora" />
        <div aria-hidden className="app-noise" />
        <SiteHeader />
        <main id="main" className="main-under-nav min-h-dvh">
          {children}
        </main>
      </>
    );
  }

  // Exact route or a sub-route (/assessment/shadow); never a sibling that
  // merely shares the prefix.
  if (pathname === "/assessment" || pathname.startsWith("/assessment/")) {
    return <AssessmentShell>{children}</AssessmentShell>;
  }

  return (
    <>
      <div aria-hidden className="app-aurora" />
      <div aria-hidden className="app-noise" />
      <AppHeader
        email={email}
        role={role}
        employerId={employerId}
        organizationId={organizationId}
      />
      <main id="main" className="relative z-10 min-h-dvh main-under-nav">
        {children}
      </main>
    </>
  );
}
