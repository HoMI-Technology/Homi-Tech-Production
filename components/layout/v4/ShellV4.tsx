"use client";

import { useEffect, useState } from "react";
import { V4LeftNav } from "@/components/layout/v4/V4LeftNav";
import { V4MobileNav } from "@/components/layout/v4/V4MobileNav";
import { V4TopCommand } from "@/components/layout/v4/V4TopCommand";
import { V4_RAIL_WIDTH_PX } from "@/lib/layout/v4-shell";

/**
 * Shell v4 — first unlock with Home. Invent-chrome / role trees are not authority.
 */
export function ShellV4({
  children,
  greeting,
  firstName,
}: {
  children: React.ReactNode;
  greeting: string;
  firstName: string | null;
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
    <div data-product-shell="v4" data-shell="v4" style={{ ["--v4-rail-width" as string]: `${V4_RAIL_WIDTH_PX}px` }}>
      <div aria-hidden className="app-aurora" />
      <div aria-hidden className="app-noise" />
      <V4LeftNav open={railOpen} onClose={() => setRailOpen(false)} />
      <div className="lg:pl-[var(--v4-rail-width)]">
        <V4TopCommand
          greeting={greeting}
          firstName={firstName}
          onOpenRail={() => setRailOpen(true)}
        />
        <main id="main" className="relative z-10 min-h-dvh main-under-nav pb-20 lg:pb-8">
          {children}
        </main>
      </div>
      <V4MobileNav />
    </div>
  );
}
