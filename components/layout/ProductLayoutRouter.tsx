"use client";

import { usePathname } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { SignedInPersonalChrome } from "@/components/layout/SignedInPersonalChrome";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { isRoleOperateRoute } from "@/lib/layout/left-rail";

/**
 * Chrome selector for the (product) group. app/(product)/layout.tsx reads the
 * session server-side but cannot know the pathname, so the shell decision lands
 * here — the thinnest possible client component, holding no state of its own.
 *
 * Three shells:
 *   - anonymous → marketing SiteHeader (public tools, shadow score)
 *   - signed-in personal → PR10 left rail + workspace header
 *   - signed-in role trees → SHELL_CRAFT v3 quiet top bar (AppHeader)
 *
 * Assessment is a flow in main#main. Compass lives in the rail (personal) or
 * the quiet bar (role trees). Every branch renders exactly one `main#main`.
 */
export function ProductLayoutRouter({
  children,
  user,
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
  email: string | null;
  fullName?: string | null;
  greeting?: string;
  firstName?: string | null;
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

  if (isRoleOperateRoute(pathname)) {
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
}
