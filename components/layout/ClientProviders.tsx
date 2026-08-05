"use client";

import { useState, useEffect } from "react";
import { LazyMotion, AnimatePresence, m } from "framer-motion";
import { usePathname } from "next/navigation";
import { ScrollProgress } from "./ScrollProgress";
import { WelcomeBanner } from "./WelcomeBanner";
import { KeyboardShortcutsProvider } from "./KeyboardShortcutsProvider";

const spring = {
  type: "spring" as const,
  stiffness: 280,
  damping: 28,
  mass: 0.8,
};

/**
 * will-change must live only while the transition runs. A permanent
 * will-change on this wrapper makes it the containing block for every
 * position:fixed descendant — CompanionWidget's launcher and
 * SessionExpiredToast pinned to the page instead of the viewport
 * (ImpactToast only survived by portaling to document.body). willChange is a
 * non-animatable style value: framer-motion sets it instantly when the
 * initial/exit variant starts, and `transitionEnd` restores "auto" once the
 * enter spring settles, dissolving the containing block.
 *
 * Exported for ClientProviders.test.tsx (structural regression contract).
 */
export const pageTransitionVariants = {
  initial: { opacity: 0, y: 12, scale: 0.995, willChange: "transform, opacity" },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transitionEnd: { willChange: "auto" },
  },
  exit: { opacity: 0, y: -8, scale: 0.998, willChange: "transform, opacity" },
};

/**
 * LazyMotion feature loader — keeps the ~34kb preloaded `motion` component
 * off the critical path. Initial shell uses the slim `m` component (~4.6kb);
 * domAnimation (+~15kb) loads after first paint. Motion docs:
 * https://motion.dev/docs/react-reduce-bundle-size
 *
 * Guarded by `__tests__/perf-bundle-guards.test.ts` — do not reintroduce
 * `import { motion } from "framer-motion"` here.
 */
const loadMotionFeatures = () =>
  import("./motion-features").then((mod) => mod.default);

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR: no second <main> — product/marketing layouts own the landmark.
  if (!mounted) {
    return <>{children}</>;
  }

  // Client: full UX layer active.
  // LazyMotion strict is intentionally off: Toast/Modal/finance still use the
  // full `motion` API elsewhere. This path still uses slim `m` + async features.
  return (
    <LazyMotion features={loadMotionFeatures}>
      <ScrollProgress />
      <KeyboardShortcutsProvider />

      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={pathname}
          data-testid="page-transition"
          variants={pageTransitionVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={spring}
        >
          <WelcomeBanner />
          {children}
        </m.div>
      </AnimatePresence>
    </LazyMotion>
  );
}
