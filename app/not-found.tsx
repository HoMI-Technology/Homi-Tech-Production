/**
 * Global 404 — renders for URLs that match no route at all (including
 * unknown locale prefixes like /fr/..., after the middleware rewrites them
 * into the default locale). This is what preserves a real 404 STATUS: it is
 * served non-streamed, unlike segment-level not-found boundaries, which
 * Next.js documents as returning 200 on streamed responses.
 *
 * With the root layout living under app/[locale]/ (i18n), there is no
 * app/layout.tsx above it — so this component renders its own <html>/<body>
 * with inline styles (globals.css may not apply here), mirroring
 * app/[locale]/global-error.tsx. Copy is English: this fallback is
 * locale-agnostic by definition; translated 404s inside valid locales are
 * served by app/[locale]/not-found.tsx.
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — HōMI",
};

export default function GlobalNotFound() {
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
        <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 24 }}>Off the compass.</h1>
        <p style={{ color: "#94a3b8", maxWidth: 420, lineHeight: 1.6 }}>
          This page doesn&rsquo;t exist. That&rsquo;s not a no — it&rsquo;s just not here.
        </p>
        {/* Plain anchor: no router/context exists in this fallback. */}
        <a
          href="/"
          style={{
            marginTop: 24,
            display: "inline-block",
            background: "linear-gradient(135deg, #22d3ee, #0ea5c4)",
            color: "#04121c",
            borderRadius: 12,
            padding: "12px 24px",
            fontWeight: 600,
            fontSize: 15,
            textDecoration: "none",
          }}
        >
          Back to true north
        </a>
      </body>
    </html>
  );
}
