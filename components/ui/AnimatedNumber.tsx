"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

import { cn } from "@/lib/planner/cn";

/**
 * Spring-animated counter. Re-tweens whenever `value` changes; counts up from
 * 0 on first mount. Default formatter is a plain locale number — callers that
 * need currency or percentage should pass their own `format`.
 *
 * Always renders with `.num`: a counter that re-tweens every frame MUST have
 * tabular figures or the glyph widths shift under it and the number visibly
 * jitters as it counts. Callers can still override face/size via `className`.
 */
export function AnimatedNumber({
  value,
  format,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { stiffness: 120, damping: 24 });
  const text = useTransform(spring, (v) =>
    format ? format(v) : Math.round(v).toLocaleString("en-US"),
  );

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  return <motion.span className={cn("num", className)}>{text}</motion.span>;
}
