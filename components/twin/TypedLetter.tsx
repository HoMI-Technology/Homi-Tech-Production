"use client";

import { useEffect, useState } from "react";

/**
 * Simple typed-reveal effect for the Temporal Twin letter. Reveals each
 * paragraph's characters progressively. Respects prefers-reduced-motion by
 * rendering full text immediately (checked once on mount).
 */
export function TypedLetter({ paragraphs, speedMs = 8 }: { paragraphs: string[]; speedMs?: number }) {
  const fullText = paragraphs.join("\n\n");
  const [shown, setShown] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    setShown(0);
  }, [fullText]);

  useEffect(() => {
    if (reducedMotion) {
      setShown(fullText.length);
      return;
    }
    if (shown >= fullText.length) return;
    // Reveal in small chunks for a natural typewriter feel without being slow on long letters.
    const chunk = 2;
    const id = setTimeout(() => setShown((s) => Math.min(s + chunk, fullText.length)), speedMs);
    return () => clearTimeout(id);
  }, [shown, fullText, speedMs, reducedMotion]);

  const visible = fullText.slice(0, shown);
  const visibleParagraphs = visible.split("\n\n");
  const isDone = shown >= fullText.length;

  return (
    <div className="flex flex-col gap-5">
      {visibleParagraphs.map((p, i) => (
        <p key={i} className="text-base leading-loose text-light">
          {p}
          {isDone === false && i === visibleParagraphs.length - 1 && (
            <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-cyan align-middle" aria-hidden="true" />
          )}
        </p>
      ))}
    </div>
  );
}
