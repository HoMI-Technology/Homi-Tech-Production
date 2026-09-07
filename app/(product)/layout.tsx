import { ProductLayoutRouter } from "@/components/layout/ProductLayoutRouter";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SessionExpiredToast } from "@/components/layout/SessionExpiredToast";
// Readiness Path-to-Ready impact toast (homi:impact:v1 bus, layout-mounted) —
// NOT the planner closed-loop score toast (components/planner/ImpactToast.tsx).
import { ImpactToast } from "@/components/readiness/ImpactToast";
// CompanionHost (not CompanionWidget): interaction-gated panel so signed-in
// Lighthouse/E2E still open the widget on click. Guests do not get the FAB —
// Companion is not anonymous customer chrome.
import { CompanionHost } from "@/components/companion/CompanionHost";
import { PageTransition } from "@/components/layout/PageTransition";
import { impactBus } from "@/lib/flags";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/**
 * Auth-aware product shell (AUDIT T2.1). Reads the session server-side and
 * hands the result to ProductLayoutRouter, which picks the chrome: signed-in
 * v3 quiet top bar, marketing SiteHeader for anonymous visitors on public product pages
 * (tools, shadow-score). Assessment stays in that quiet bar — a flow in main#main.
 *
 * Reading cookies here makes the (product) group dynamically rendered — an
 * intentional tradeoff: the tools are client-computed anyway, and a correct,
 * flicker-free shell matters more than static caching of these interactive pages.
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

      <ProductLayoutRouter
        user={!!user}
        email={user?.email ?? null}
        role={role}
        employerId={employerId}
        organizationId={organizationId}
      >
        <PageTransition>{children}</PageTransition>
      </ProductLayoutRouter>

      <SiteFooter />
      {user && <CompanionHost />}
      {user && <SessionExpiredToast />}
      {impactBus ? <ImpactToast /> : null}
    </>
  );
}
