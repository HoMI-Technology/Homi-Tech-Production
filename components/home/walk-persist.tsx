"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PRIMARY_CLOSE_HREF, PRIMARY_CLOSE_LABEL } from "@/components/marketing/first-moment-copy";
import { CinematicCompass } from "./CinematicCompass";
import { track } from "@/lib/analytics";

/**
 * Persistent walk objects — one compass, one Assess follower.
 * Hero owns the first-paint Assess. The follower appears only after that
 * pill leaves the viewport, then docks away before waitlist / footer / cookie.
 * Compass travels, docks as the mark for Clarity, then stops.
 */

function handleCtaClick() {
  track("hero_cta_click", { src: "hero" });
}

type CompassAt = "field" | "object" | "docked" | "parked";

export function WalkPersist({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [atObject, setAtObject] = useState(false);
  const [docked, setDocked] = useState(false);
  const [parked, setParked] = useState(false);
  const [footerIn, setFooterIn] = useState(false);
  const [cookieIn, setCookieIn] = useState(false);
  const [heroAssessGone, setHeroAssessGone] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) setReduced(true);

    const object = root.querySelector("[data-walk-object]");
    const waitlist = root.querySelector("#waitlist");
    const footer = document.querySelector("footer");
    const cookie = document.querySelector("#cookie-consent");
    const heroAssess = root.querySelector("[data-walk-hero-assess]");

    const observers: IntersectionObserver[] = [];

    if (object && !reducedMotion) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.35)) {
            setAtObject(true);
          }
        },
        { threshold: [0.35] },
      );
      io.observe(object);
      observers.push(io);
    }

    if (heroAssess) {
      const io = new IntersectionObserver(
        (entries) => {
          setHeroAssessGone(entries.every((entry) => !entry.isIntersecting));
        },
        { threshold: [0] },
      );
      io.observe(heroAssess);
      observers.push(io);
    }

    if (waitlist) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.12)) {
            setDocked(true);
          }
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

  const placed: Exclude<CompassAt, "docked" | "parked"> = atObject && !reduced ? "object" : "field";
  const compassAt: CompassAt = footerIn ? "parked" : docked ? "docked" : placed;
  const assessAway = !heroAssessGone || docked || footerIn;

  return (
    <div ref={rootRef} className="walk-persist relative">
      <div className="walk-persist-layer sticky top-0 z-[5] h-0 overflow-visible">
        <div className="walk-persist-frame pointer-events-none relative h-[100dvh]">
          <div
            className={
              placed === "object"
                ? `walk-travel-compass is-object${compassAt === "docked" ? " is-docked" : ""}${compassAt === "parked" ? " is-parked" : ""}`
                : `walk-travel-compass hero-instrument-field lg:left-[38%]${compassAt === "docked" ? " is-docked" : ""}${compassAt === "parked" ? " is-parked" : ""}`
            }
            data-at={compassAt}
            data-walk-compass=""
            aria-hidden
          >
            <div className="walk-travel-compass-body">
              <div className="walk-compass-halo" />
              <CinematicCompass responsive keyholePulse={false} />
            </div>
          </div>

          <div
            className="walk-travel-assess"
            data-walk-assess-slot=""
            data-fade={assessAway ? "away" : undefined}
            data-cookie={cookieIn ? "" : undefined}
          >
            <div className="walk-cluster mx-auto flex h-full w-full max-w-7xl flex-col items-start justify-center px-5 sm:px-6 lg:px-8">
              <div className="walk-line" aria-hidden />
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
