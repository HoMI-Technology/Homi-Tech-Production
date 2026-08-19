"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PRIMARY_CLOSE_HREF, PRIMARY_CLOSE_LABEL } from "@/components/marketing/first-moment-copy";
import { track } from "@/lib/analytics";

/**
 * One traveling Assess for the walk. The same instance paints in the
 * hero (below the locked question, never on the type), travels with
 * the scenes, then parks (inert + aria-hidden) before waitlist
 * “Get notified”, footer, or cookie Reject/Accept. Header chrome
 * Assess is nav — not a second walk CTA.
 */

function handleCtaClick() {
  track("hero_cta_click", { src: "hero" });
}

export function WalkPersist({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [docked, setDocked] = useState(false);
  const [footerIn, setFooterIn] = useState(false);
  const [cookieIn, setCookieIn] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const waitlist = root.querySelector("#waitlist");
    const footer = document.querySelector("footer");
    const cookie = document.querySelector("#cookie-consent");
    const observers: IntersectionObserver[] = [];

    if (waitlist) {
      const io = new IntersectionObserver(
        (entries) => {
          setDocked(entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.12));
        },
        { threshold: [0.12], rootMargin: "12% 0px -8% 0px" },
      );
      io.observe(waitlist);
      observers.push(io);
    }

    if (footer) {
      const io = new IntersectionObserver(
        (entries) => {
          setFooterIn(entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.08));
        },
        { threshold: [0.08], rootMargin: "24% 0px 0px 0px" },
      );
      io.observe(footer);
      observers.push(io);
    }

    if (cookie) {
      const io = new IntersectionObserver(
        (entries) => {
          setCookieIn(entries.some((entry) => entry.isIntersecting));
        },
        { threshold: [0] },
      );
      io.observe(cookie);
      observers.push(io);
    }

    return () => observers.forEach((io) => io.disconnect());
  }, []);

  const assessAway = docked || footerIn;

  return (
    <div ref={rootRef} className="walk-persist relative">
      <div className="walk-persist-layer sticky top-0 z-[5] h-0 overflow-visible">
        <div className="walk-persist-frame pointer-events-none relative h-[100dvh]">
          <div
            className="walk-travel-assess hero-story"
            data-walk-assess-slot=""
            data-fade={assessAway ? "away" : undefined}
            data-cookie={cookieIn ? "" : undefined}
            aria-hidden={assessAway || undefined}
            inert={assessAway || undefined}
          >
            <div className="walk-cluster mx-auto flex h-full w-full max-w-7xl flex-col items-start justify-center px-5 sm:px-6 lg:px-8">
              {/*
                Stack height = the line band only. Assess is out of flow so
                justify-center matches the locked H1 — the pill sits below
                the question, not on “be”.
              */}
              <div className="walk-travel-assess-stack">
                <div className="walk-line" aria-hidden style={{ minHeight: "14rem" }} />
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
      </div>
      {children}
    </div>
  );
}
