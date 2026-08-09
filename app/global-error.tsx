"use client";

/**
 * Next.js global-error.tsx — root-level error boundary.
 * Replaces the entire app when even the root layout fails, so it must
 * render its own <html>/<body> with inline styles (globals.css may not
 * be available in this state). Wraps the app in our polished ErrorBoundary
 * fallback for a consistent, on-brand recovery experience.
 */

import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { COLORS, withAlpha } from "@/lib/brand";
import { motion } from "framer-motion";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: COLORS.navy,
          color: COLORS.light,
          fontFamily: "Inter, system-ui, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <ThresholdCompass size={100} animated={false} glow={false} />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            fontSize: 24,
            fontWeight: 800,
            marginTop: 24,
            color: COLORS.light,
          }}
        >
          Something went wrong
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            color: COLORS.dim,
            maxWidth: 420,
            lineHeight: 1.6,
            marginTop: 12,
          }}
        >
          Not you — us. Your data is safe. Try again in a moment, or reach out if the problem keeps
          happening.
        </motion.p>

        {error.digest && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.3 }}
            style={{
              color: COLORS.dim,
              opacity: 0.6,
              fontSize: 12,
              fontFamily: "monospace",
              marginTop: 8,
            }}
          >
            ref {error.digest}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          style={{
            marginTop: 24,
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "center",
          }}
        >
          <button
            onClick={reset}
            style={{
              background: `linear-gradient(135deg, ${COLORS.cyan}, #0ea5c4)`,
              color: "#04121c",
              border: "none",
              borderRadius: 12,
              padding: "12px 24px",
              fontWeight: 600,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          <a
            href="mailto:support@homitechnology.com?subject=H%C5%8DMI%20App%20Error%20Report"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              background: withAlpha(COLORS.slateSurface, 0.5),
              color: COLORS.light,
              border: `1px solid ${withAlpha(COLORS.dim, 0.2)}`,
              borderRadius: 12,
              padding: "12px 24px",
              fontWeight: 600,
              fontSize: 15,
              textDecoration: "none",
            }}
          >
            Report issue
          </a>
        </motion.div>
      </body>
    </html>
  );
}
