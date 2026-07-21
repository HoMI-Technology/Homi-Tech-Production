"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const STORAGE_KEY = "homi_welcomed";
const DISMISS_MS = 10000;

export function WelcomeBanner() {
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const welcomed = localStorage.getItem(STORAGE_KEY);
    if (welcomed === null) {
      const timer = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!show || reducedMotion) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / DISMISS_MS) * 100);
      setProgress(pct);
      if (elapsed >= DISMISS_MS) {
        dismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [show, reducedMotion]);

  const dismiss = useCallback(() => {
    setShow(false);
    localStorage.setItem(STORAGE_KEY, new Date().toISOString());
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: -20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reducedMotion ? {} : { opacity: 0, y: -10, scale: 0.98 }}
          transition={reducedMotion ? {} : { type: "spring", stiffness: 400, damping: 25, mass: 0.8 }}
          className="glass glass-hover relative mx-4 mt-4 overflow-hidden"
          style={{
            borderColor: "rgba(34, 211, 238, 0.25)",
            boxShadow: "inset 0 1px 0 rgba(226, 232, 240, 0.07), 0 24px 48px -18px rgba(2, 6, 16, 0.7), 0 0 44px -18px rgba(34, 211, 238, 0.2)",
          }}
        >
          <div className="flex items-start gap-4 px-6 py-5">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: "rgba(34, 211, 238, 0.12)" }}
            >
              <svg className="h-5 w-5 text-cyan" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10 2l6 2.5v4.5c0 5.05-3.41 9.76-8 10.5-4.59-1.08-6-4.36-6-8.5V4.5L10 2z" />
                <path d="M7.5 10l1.8 1.8L12.8 8" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-semibold text-light">
                Welcome to HōMI — your decision companion
              </p>
              <p className="mt-1 text-sm leading-relaxed text-dim">
                Measure your readiness across Financial Reality, Emotional Truth, and
                Perfect Timing. Not &ldquo;can you afford it?&rdquo; — &ldquo;are you
                ready for it?&rdquo;
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button onClick={dismiss} className="btn btn-primary !px-4 !py-2 text-sm">
                  Get started
                </button>
                <button onClick={dismiss} className="btn btn-ghost !px-4 !py-2 text-sm">
                  Dismiss
                </button>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="shrink-0 rounded-lg p-1.5 text-dim transition-colors hover:text-light"
              aria-label="Dismiss welcome banner"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 2l12 12M14 2L2 14" />
              </svg>
            </button>
          </div>

          {!reducedMotion && (
            <div
              className="absolute bottom-0 left-0 h-0.5 bg-cyan/50 transition-none"
              style={{ width: `${progress}%` }}
              aria-hidden="true"
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
