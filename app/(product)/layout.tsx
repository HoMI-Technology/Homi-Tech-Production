import { headers } from "next/headers";
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
import { greetingForHour, hourInTimezone } from "@/lib/dashboard/insight";
import { firstNameFromProfile } from "@/lib/layout/left-rail";
import {
  pathnameFromRequestHeaders,
  productShellFor,
} from "@/lib/layout/product-shell";
import { impactBus } from "@/lib/flags";
import { getCachedClient, getCachedUser } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/**
 * Auth-aware product shell (AUDIT T2.1). Reads the session server-side and
 * computes `shell` via productShellFor so signed-in `/dashboard` mounts the
 * PR13 invent rail — not marketing SiteHeader or the role-tree quiet bar.
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
  let fullName: string | null = null;

  if (user) {
    try {
      const supabase = await getCachedClient();
      const { data } = await supabase
        .from("profiles")
        .select("role, employer_id, organization_id, full_name")
        .eq("id", user.id)
        .maybeSingle();
      const p = data as Pick<
        Profile,
        "role" | "employer_id" | "organization_id" | "full_name"
      > | null;
      role = p?.role ?? null;
      employerId = p?.employer_id ?? null;
      organizationId = p?.organization_id ?? null;
      fullName = p?.full_name ?? null;
    } catch {
      // Header still works without switcher context.
    }
  }

  const headerList = await headers();
  const greeting = greetingForHour(hourInTimezone(headerList.get("x-vercel-ip-timezone")));
  const firstName = firstNameFromProfile(fullName, user?.email ?? null);
  const shell = productShellFor(pathnameFromRequestHeaders(headerList), !!user);

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <ProductLayoutRouter
        user={!!user}
        shell={shell}
        email={user?.email ?? null}
        fullName={fullName}
        greeting={greeting}
        firstName={firstName}
        role={role}
        employerId={employerId}
        organizationId={organizationId}
      >
        <PageTransition>{children}</PageTransition>
      </ProductLayoutRouter>

      {shell === "v4" ? null : <SiteFooter />}
      {user && shell !== "v4" ? <CompanionHost /> : null}
      {user && <SessionExpiredToast />}
      {impactBus ? <ImpactToast /> : null}
    </>
  );
}
