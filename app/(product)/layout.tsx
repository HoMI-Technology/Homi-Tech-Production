import { SiteHeader } from "@/components/layout/SiteHeader";
import { AppHeader } from "@/components/layout/AppHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SessionExpiredToast } from "@/components/layout/SessionExpiredToast";
import { CompanionWidget } from "@/components/companion/CompanionWidget";
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
  // Request-cached: pages under this layout share the same getUser() result
  // instead of paying the Auth-server round-trip twice per request.
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
      {user ? (
        <AppHeader
          email={user.email ?? null}
          role={role}
          employerId={employerId}
          organizationId={organizationId}
        />
      ) : (
        <SiteHeader />
      )}
      <main id="main" className="pt-[72px] min-h-screen">{children}</main>
      <SiteFooter />
      <CompanionWidget />
      {user && <SessionExpiredToast />}
    </>
  );
}
