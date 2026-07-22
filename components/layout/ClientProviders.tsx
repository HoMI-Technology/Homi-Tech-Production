"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "@/i18n/navigation";
import { ScrollProgress } from "./ScrollProgress";
import { WelcomeBanner } from "./WelcomeBanner";
import { KeyboardShortcutsProvider } from "./KeyboardShortcutsProvider";

const spring = {
  type: "spring" as const,
  stiffness: 280,
  damping: 28,
  mass: 0.8,
};

const variants = {
  initial: { opacity: 0, y: 12, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.998 },
};

export function ClientProviders({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR: render static children only (no animations, no localStorage, no window)
  if (!mounted) {
    return <main id="main">{children}</main>;
  }

  // Client: full UX layer active
  return (
    <>
      <ScrollProgress />
      <KeyboardShortcutsProvider />

      <main id="main">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={pathname}
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={spring}
            style={{ willChange: "transform, opacity" }}
          >
            <WelcomeBanner />
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </>
  );
}
