/**
 * useDynamicTitle — Updates document title based on visible page section.
 * Uses IntersectionObserver with 5 thresholds for smooth transitions.
 * Debounced at 300ms to prevent title flicker.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useReducedMotion } from "./useReducedMotion";

interface SectionTitle {
  id: string;
  title: string;
}

interface UseDynamicTitleOptions {
  sections: SectionTitle[];
  baseTitle?: string;
  debounceMs?: number;
}

export function useDynamicTitle({
  sections,
  baseTitle = "HōMI",
  debounceMs = 300,
}: UseDynamicTitleOptions) {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      let maxRatio = 0;
      let mostVisible: string | null = null;

      for (const entry of entries) {
        if (entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio;
          mostVisible = entry.target.id;
        }
      }

      if (mostVisible && maxRatio > 0.25) {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          setActiveSection(mostVisible);
        }, debounceMs);
      }
    },
    [debounceMs],
  );

  useEffect(() => {
    if (reducedMotion || sections.length === 0) return;

    const observer = new IntersectionObserver(handleIntersection, {
      root: null,
      rootMargin: "-10% 0px -10% 0px",
      threshold: [0, 0.25, 0.5, 0.75, 1.0],
    });

    for (const section of sections) {
      const el = document.getElementById(section.id);
      if (el) observer.observe(el);
    }

    return () => {
      observer.disconnect();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [sections, handleIntersection, reducedMotion]);

  useEffect(() => {
    if (!activeSection) {
      document.title = baseTitle;
      return;
    }
    const section = sections.find((s) => s.id === activeSection);
    if (section) {
      document.title = `${section.title} · ${baseTitle}`;
    }
    return () => { document.title = baseTitle; };
  }, [activeSection, sections, baseTitle]);

  return activeSection;
}
