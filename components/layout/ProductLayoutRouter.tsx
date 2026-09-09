"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { SignedInPersonalChrome } from "@/components/layout/SignedInPersonalChrome";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { ShellV4 } from "@/components/layout/v4/ShellV4";
import {
  resolveProductShell,
  type ProductShell,
} from "@/lib/layout/product-shell";

/**
 * Chrome selector for the (product) group. The server layout computes `shell`
 * from the session + request path so signed-in `/dashboard` cannot paint
 * marketing SiteHeader or the role-tree quiet bar. Client pathname only
 * upgrades to role trees (employee/partner/admin/team).
 *
 * Three shells:
 *   - anonymous → marketing SiteHeader (public tools, shadow score)
 *   - signed-in personal → PR13 left rail + workspace header
 *   - signed-in role trees → SHELL_CRAFT v3 quiet top bar (AppHeader)
 *
 * Assessment is a flow in main#main. Compass lives in the rail (personal) or
 * the quiet bar (role trees). Every branch renders exactly one `main#main`.
 */
export function ProductLayoutRouter({
  children,
  user,
  shell,
  email,
  fullName,
  greeting,
  firstName,
  role,
  employerId,
  organizationId,
}: {
  children: React.ReactNode;
  /** true = authenticated. The session itself never crosses to the client. */
  user: boolean;
  /** Server chrome lock from productShellFor(pathname, !!user). */
  shell: ProductShell;
  email: string | null;
  fullName?: string | null;
  greeting?: string;
  firstName?: string | null;
  role?: string | null;
  employerId?: string | null;
  organizationId?: string | null;
}) {
  const pathname = usePathname();
  const effective = resolveProductShell(shell, pathname, user);

  switch (effective) {
    case "guest":
      return (
        <div data-product-shell="guest">
          <div aria-hidden className="app-aurora" />
          <div aria-hidden className="app-noise" />
          <SiteHeader />
          <main id="main" className="main-under-nav min-h-dvh">
            {children}
          </main>
        </div>
      );
    case "role":
      return (
        <div data-product-shell="role">
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
        </div>
      );
    case "v4":
      return (
        <ShellV4 greeting={greeting ?? "Welcome back"} firstName={firstName ?? null}>
          {children}
        </ShellV4>
      );
    case "personal":
      return (
        <SignedInPersonalChrome
          email={email}
          fullName={fullName ?? null}
          greeting={greeting ?? "Welcome back"}
          firstName={firstName ?? null}
          role={role}
          employerId={employerId}
          organizationId={organizationId}
        >
          {children}
        </SignedInPersonalChrome>
      );
    default: {
      const _exhaustive: never = effective;
      void _exhaustive;
      return null;
    }
  }
}
