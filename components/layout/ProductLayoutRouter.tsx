"use client";

import { usePathname } from "next/navigation";
import { AssessmentShell } from "@/components/assessment/AssessmentShell";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { ProductBottomNav } from "@/components/layout/ProductBottomNav";
import { SiteHeader } from "@/components/layout/SiteHeader";

/**
 * Chrome selector for the (product) group. app/(product)/layout.tsx reads the
 * session server-side but cannot know the pathname, so the shell decision lands
 * here — the thinnest possible client component, holding no state of its own.
 *
 * Three shells:
 *   - anonymous              → marketing SiteHeader (public tools, shadow score)
 *   - signed in              → AppSidebar rail + offset main + ProductBottomNav
 *                              (mobile-only five-mode tab bar; hidden at lg)
 *   - signed in, /assessment → AssessmentShell, full-bleed, no sidebar, no
 *                              bottom nav (focus mode keeps the viewport clean)
 *
 * The assessment branch drops the atmospheric aurora/noise layers along with
 * the rail: focus mode means nothing on screen competes with the question.
 * Every branch renders exactly one `main#main` (AssessmentShell provides its
 * own) so the layout's skip link always has a target.
 *
 * The signed-in main carries mobile bottom padding equal to the bottom bar
 * height + safe-area inset so the fixed ProductBottomNav never covers page
 * content; the padding collapses at lg where the bar is hidden.
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
      <AppSidebar
        email={email}
        role={role}
        employerId={employerId}
        organizationId={organizationId}
      />
      <main
        id="main"
        className="relative z-10 min-h-dvh pt-14 pb-[calc(4.5rem_+_env(safe-area-inset-bottom,0px))] lg:pt-0 lg:pb-0 lg:pl-[72px] xl:pl-[248px]"
      >
        {children}
      </main>
      <ProductBottomNav />
    </>
  );
}
