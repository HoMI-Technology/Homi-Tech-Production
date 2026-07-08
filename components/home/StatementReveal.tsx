"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The statement — words lit one at a time by the reader's own scroll.
 * Nothing on the screen but the sentence, arriving like a thought.
 * Reduced motion: fully lit, always.
 */

const LINE_1 = ["Everyone", "else", "tells", "you", "how."];
const LINE_2 = ["HōMI", "tells", "you"];

export function StatementReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [lit, setLit] = useState(0);
  const total = LINE_1.length + LINE_2.length + 1; // + the "if."

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setLit(total);
      return;
    }
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        // progress 0 → 1 as the element travels from 90% to 35% of viewport
        const p = Math.max(0, Math.min(1, (vh * 0.9 - r.top) / (vh * 0.55)));
        setLit(Math.round(p * total));
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [total]);

  let i = 0;
  const word = (w: string, cls = "") => {
    const on = i < lit;
    i += 1;
    return (
      <span key={`${w}-${i}`} className={`sword ${on ? "lit" : ""} ${cls}`}>
        {w}{" "}
      </span>
    );
  };

  return (
    <div ref={ref}>
      <h2 className="type-statement mx-auto max-w-5xl font-display font-semibold text-light">
        {LINE_1.map((w) => word(w))}
        <br />
        {LINE_2.map((w) => word(w))}
        {(() => {
          const on = i < lit;
          return (
            <span className={`sword ${on ? "lit" : ""} text-aurora`}>if.</span>
          );
        })()}
      </h2>
    </div>
  );
}
