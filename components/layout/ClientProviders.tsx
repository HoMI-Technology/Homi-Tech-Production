"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

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

  return (
    <>
      {/* ScrollProgress and KeyboardShortcutsProvider mount safely — they check useReducedMotion */}
      {/* They are imported here to keep them in the client bundle */}
      {/* We render them conditionally below */}

      <main id="main">
        {mounted ? (
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
              {/* WelcomeBanner is safe here — useEffect controls localStorage access */}
              {children}
            </motion.div>
          </AnimatePresence>
        ) : (
          <>{children}</>
        )}
      </main>
    </>
  );
}
