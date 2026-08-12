"use client";

import { LazyMotion, AnimatePresence, m } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * Pathname-keyed fade/slide for product `<main>` content.
 *
 * Lives inside the shell, not around it: the sidebar rail (and its nav-pill
 * spring) must stay mounted across route changes. Root ClientProviders still
 * supplies motion context for marketing/chrome; this wrapper is the OS-shell
 * contract for authenticated pages.
 *
 * Uses `m` + async features so the preloaded `motion` component stays off the
 * product-layout critical path (same rule as ClientProviders).
 */
const loadMotionFeatures = () => import("./motion-features").then((mod) => mod.default);

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <LazyMotion features={loadMotionFeatures}>
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={pathname}
          data-testid="product-page-transition"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
        >
          {children}
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}
