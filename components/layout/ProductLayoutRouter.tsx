"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * Chrome selector for the (product) group. app/(product)/layout.tsx reads the
 * session server-side but cannot know the pathname, so the shell decision lands
 * here — the thinnest possible client component, holding no state of its own.
 *
 * Two shells:
 *   - anonymous → marketing SiteHeader (public tools, shadow score)
 *   - signed in → SHELL_CRAFT v3 quiet top bar (AppHeader) + main#main
 *
 * Assessment is a flow in main#main inside the quiet top bar. No left rail.
 * Compass stays in the bar. Every branch renders exactly one `main#main`.
 *
 * Signed-in chrome is a quiet top bar only — no Jump slab, no mobile bottom
 * tab bar. Depth lives behind ··· (live routes).
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
