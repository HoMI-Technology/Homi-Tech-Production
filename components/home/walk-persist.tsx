"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { PRIMARY_CLOSE_HREF, PRIMARY_CLOSE_LABEL } from "@/components/marketing/first-moment-copy";
import { CinematicCompass } from "./CinematicCompass";
import { track } from "@/lib/analytics";

/**
 * Persistent walk objects — one Brand compass, one Assess pill.
 * The compass is the existing Threshold instrument.
 * It travels in the lower-right field so it never sits on the H1 or
 * the Assess pill. Assess paints below the locked question, travels,
 * then parks before waitlist, footer, or cookie controls.
 * Header chrome Assess is nav — not a second walk CTA.
 */

/** Quiet field seat — overrides the cinema-scale desktop inset. */
const COMPASS_FIELD: CSSProperties = {
  position: "absolute",
  top: "auto",
  left: "auto",
  right: "max(1.25rem, 5vw)",
  bottom: "max(6.75rem, 12vh)",
  width: "min(26vmin, 9.25rem)",
  height: "auto",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "flex-end",
};

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
            className={assessAway ? "walk-travel-compass is-parked" : "walk-travel-compass"}
            data-at={assessAway ? "parked" : "field"}
            data-walk-compass=""
            data-walk-object=""
            aria-hidden
            style={COMPASS_FIELD}
          >
            <div className="walk-travel-compass-body" style={{ width: "100%" }}>
              <CinematicCompass responsive keyholePulse={false} />
            </div>
          </div>

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
