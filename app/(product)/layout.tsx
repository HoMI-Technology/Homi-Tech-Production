import { SiteHeader } from "@/components/layout/SiteHeader";
import { AppHeader } from "@/components/layout/AppHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CompanionWidget } from "@/components/companion/CompanionWidget";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      {user ? <AppHeader email={user.email ?? null} /> : <SiteHeader />}
      <main id="main" className="pt-[72px] min-h-screen">{children}</main>
      <SiteFooter />
      <CompanionWidget />
    </>
  );
}
