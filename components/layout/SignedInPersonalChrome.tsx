"use client";

import { useEffect, useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppWorkspaceHeader } from "@/components/layout/AppWorkspaceHeader";

/**
 * Personal signed-in chrome: left rail + workspace header.
 * Drawer on small screens; desktop rail is always visible.
 */
export function SignedInPersonalChrome({
  children,
  email,
  fullName,
  greeting,
  firstName,
  role,
  employerId,
  organizationId,
}: {
  children: React.ReactNode;
  email: string | null;
  fullName: string | null;
  greeting: string;
  firstName: string | null;
  role?: string | null;
  employerId?: string | null;
  organizationId?: string | null;
}) {
  const [railOpen, setRailOpen] = useState(false);

  useEffect(() => {
    if (!railOpen) return;
    const prev = document.body.style.overflowY;
    document.body.style.overflowY = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setRailOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflowY = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [railOpen]);

  return (
    <div data-product-shell="personal" data-invent-chrome="pr13">
      <div aria-hidden className="app-aurora" />
      <div aria-hidden className="app-noise" />
      <AppSidebar
        email={email}
        fullName={fullName}
        role={role}
        employerId={employerId}
        organizationId={organizationId}
        open={railOpen}
        onClose={() => setRailOpen(false)}
      />
      <div className="lg:pl-[var(--rail-width)]">
        <AppWorkspaceHeader
          greeting={greeting}
          firstName={firstName}
          role={role}
          employerId={employerId}
          organizationId={organizationId}
          onOpenRail={() => setRailOpen(true)}
        />
        <main id="main" className="relative z-10 min-h-dvh main-under-nav">
          {children}
        </main>
      </div>
    </div>
  );
}
