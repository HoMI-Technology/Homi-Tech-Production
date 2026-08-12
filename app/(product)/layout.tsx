import { SiteHeader } from "@/components/layout/SiteHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SessionExpiredToast } from "@/components/layout/SessionExpiredToast";
import { ImpactToast } from "@/components/readiness/ImpactToast";
// CompanionHost (not CompanionWidget): interaction-gated panel so public
// Lighthouse script budget stays green without removing Companion for E2E.
import { CompanionHost } from "@/components/companion/CompanionHost";
import { PageTransition } from "@/components/layout/PageTransition";
import { impactBus } from "@/lib/flags";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/**
 * Auth-aware product shell (AUDIT T2.1). Reads the session server-side and
 * renders the signed-in AppHeader (product nav + user menu, making every route
 * reachable) or the marketing SiteHeader for anonymous visitors on public
 * product pages (tools, shadow-score). Reading cookies here makes the (product)
 * group dynamically rendered — an intentional tradeoff: the tools are
 * client-computed anyway, and a correct, flicker-free shell matters more than
 * static caching of these interactive pages.
 */
export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  const user = await getCachedUser();

  let role: string | null = null;
  let employerId: string | null = null;
  let organizationId: string | null = null;

  if (user) {
    try {
      const supabase = await getCachedClient();
      const { data } = await supabase
        .from("profiles")
        .select("role, employer_id, organization_id")
        .eq("id", user.id)
        .maybeSingle();
      const p = data as Pick<Profile, "role" | "employer_id" | "organization_id"> | null;
      role = p?.role ?? null;
      employerId = p?.employer_id ?? null;
      organizationId = p?.organization_id ?? null;
    } catch {
      // Header still works without switcher context.
    }
  }

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      {/* Atmospheric layers — behind everything */}
      <div aria-hidden className="app-aurora" />
      <div aria-hidden className="app-noise" />

      {user ? (
        <AppSidebar
          email={user.email ?? null}
          role={role}
          employerId={employerId}
          organizationId={organizationId}
        />
      ) : (
        <SiteHeader />
      )}

      <main
        id="main"
        className={
          user
            ? "relative z-10 min-h-dvh pt-14 lg:pt-0 lg:pl-[72px] xl:pl-[248px]"
            : "main-under-nav min-h-dvh"
        }
      >
        <PageTransition>{children}</PageTransition>
      </main>

      <SiteFooter />
      {/* Always mount the thin host for signed-out + signed-in. Heavy
          CompanionWidget JS loads only on open / synthesis (see CompanionHost). */}
      <CompanionHost />
      {user && <SessionExpiredToast />}
      {impactBus ? <ImpactToast /> : null}
    </>
  );
}
