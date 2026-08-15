"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PRIMARY_CLOSE_HREF, PRIMARY_CLOSE_LABEL } from "@/components/marketing/first-moment-copy";
import { CinematicCompass } from "./CinematicCompass";
import { track } from "@/lib/analytics";

/**
 * Persistent walk objects — one compass, one Assess pill.
 * They travel. They are not destroyed on the hero and reborn later.
 * Arriving at the object beat is one-way; we do not reverse-animate.
 */

function handleCtaClick() {
  track("hero_cta_click", { src: "hero" });
}

export function WalkPersist({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [atObject, setAtObject] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setReduced(true);
      return;
    }

    const target = root.querySelector("[data-walk-object]");
    if (!target) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.35)) {
          setAtObject(true);
        }
      },
      { threshold: [0.35] },
    );
    io.observe(target);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="walk-persist relative">
      <div className="walk-persist-layer sticky top-0 z-[5] h-0 overflow-visible">
        <div className="walk-persist-frame pointer-events-none relative h-[100dvh]">
          <div
            className={
              atObject && !reduced
                ? "walk-travel-compass is-object"
                : "walk-travel-compass hero-instrument-field lg:left-[38%]"
            }
            data-at={atObject && !reduced ? "object" : "field"}
            data-walk-compass=""
            aria-hidden
          >
            <div className="walk-travel-compass-body">
              <CinematicCompass responsive keyholePulse={false} />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-[max(6.5rem,env(safe-area-inset-bottom,0px)+5.5rem)] z-20">
            <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
              <Link
                href={`${PRIMARY_CLOSE_HREF}?src=hero`}
                className="btn btn-primary btn-sm pointer-events-auto"
                data-walk-assess=""
                onClick={handleCtaClick}
              >
                {PRIMARY_CLOSE_LABEL}
              </Link>
            </div>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
