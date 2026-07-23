"use client";

import { Component, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Reusable React error boundary with a polished, on-brand fallback UI.
 * Catches errors in child trees and renders a calm recovery screen.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[ErrorBoundary${this.props.name ? `:${this.props.name}` : ""}]`,
      error,
      errorInfo
    );
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return <ErrorFallback error={this.state.error} onReset={this.handleReset} />;
    }
    return this.props.children;
  }
}

/**
 * Standalone fallback UI rendered when the boundary catches an error.
 * Uses the HōMI brand palette, compass iconography, and calm copy.
 */
function ErrorFallback({
  error,
  onReset,
}: {
  error?: Error;
  onReset: () => void;
}) {
  return (
    <AnimatePresence>
      <motion.main
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      >
        <ThresholdCompass size={120} animated={false} glow={false} />

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 text-3xl font-black text-light"
        >
          Something went wrong
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-3 max-w-md text-dim"
        >
          Not you — us. Your data is safe, and nothing was lost. Try again, or
          let us know if the issue persists.
        </motion.p>

        {error?.message && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="score-numeral mt-2 max-w-md text-xs text-dim/50"
          >
            {error.message}
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <button onClick={onReset} className="btn btn-primary">
            Try again
          </button>
          <a
            href="mailto:support@homitechnology.com?subject=H%C5%8DMI%20App%20Error%20Report"
            className="btn btn-ghost"
          >
            Report issue
          </a>
        </motion.div>
      </motion.main>
    </AnimatePresence>
  );
}
