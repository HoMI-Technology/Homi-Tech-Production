"use client";

/**
 * Last-resort boundary: replaces the root layout when even the layout
 * fails, so it must render its own <html>/<body> and carry inline styles
 * (globals.css may not be available in this state).
 */
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
          background: "#0a1628",
          color: "#e2e8f0",
          fontFamily: "Inter, system-ui, sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <p style={{ fontWeight: 900, fontSize: 28, letterSpacing: "-0.02em", margin: 0 }}>
          <span style={{ color: "#22d3ee" }}>H</span>
          <span style={{ color: "#34d399" }}>ō</span>
          <span style={{ color: "#facc15" }}>M</span>
          <span style={{ color: "#22d3ee" }}>I</span>
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 24 }}>Something slipped.</h1>
        <p style={{ color: "#94a3b8", maxWidth: 420, lineHeight: 1.6 }}>
          Not you — us. Your data is safe. Try again in a moment.
        </p>
        {error.digest && (
          <p style={{ color: "#94a3b8", opacity: 0.6, fontSize: 12, fontFamily: "monospace" }}>
            ref {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            marginTop: 24,
            background: "linear-gradient(135deg, #22d3ee, #0ea5c4)",
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
      </body>
    </html>
  );
}
