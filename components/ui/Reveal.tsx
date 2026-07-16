"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scroll-triggered reveal, LCP-safe.
 *
 * Server HTML renders VISIBLE — no `reveal` class — so first paint carries the
 * content and Largest Contentful Paint ≈ First Contentful Paint. At hydration,
 * JS opts *into* the hidden state only for elements still below the fold (the
 * user hasn't seen them; hiding is imperceptible) and reveals them on
 * intersection as before. Elements already in the viewport are never hidden:
 * yanking painted content back to opacity 0 two seconds in is a glitch, not an
 * entrance.
 *
 * Consequences, all intentional:
 *  · LCP no longer waits for hydration (this was costing ~2s on every
 *    marketing page under mobile emulation).
 *  · No-JS and reduced-motion visitors simply see the content.
 *  · Below-fold behavior is unchanged.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rect = el.getBoundingClientRect();
    const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
    if (inViewport) return; // already painted — never hide seen content

    el.classList.add("reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("is-visible");
            io.disconnect();
          }
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}
