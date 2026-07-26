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
        {/* Wordmark */}
        <p
          style={{
            fontWeight: 900,
            fontSize: 32,
            letterSpacing: "-0.02em",
            margin: 0,
            lineHeight: 1,
          }}
        >
          <span style={{ color: "#22d3ee" }}>H</span>
          <span style={{ color: "#34d399" }}>ō</span>
          <span style={{ color: "#facc15" }}>M</span>
          <span style={{ color: "#22d3ee" }}>I</span>
        </p>

        {/* Compass ring decorative element */}
        <div
          style={{
            marginTop: 32,
            width: 80,
            height: 80,
            borderRadius: "50%",
            border: "2px solid rgba(34, 211, 238, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              border: "2px solid rgba(52, 211, 153, 0.2)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#22d3ee",
              top: 8,
              left: "50%",
              transform: "translateX(-50%)",
              boxShadow: "0 0 10px rgba(34, 211, 238, 0.5)",
            }}
          />
        </div>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            marginTop: 28,
            color: "#e2e8f0",
          }}
        >
          Off the compass.
        </h1>
        <p
          style={{
            color: "#94a3b8",
            maxWidth: 420,
            lineHeight: 1.6,
            marginTop: 12,
          }}
        >
          This page doesn&rsquo;t exist. That&rsquo;s not a no — it&rsquo;s just
          not here.
        </p>

        <style
          dangerouslySetInnerHTML={{
            __html: `
              a.homi-404-home {
                margin-top: 28px;
                display: inline-block;
                background: linear-gradient(135deg, #22d3ee, #0ea5c4);
                color: #04121c;
                border-radius: 12px;
                padding: 12px 28px;
                font-weight: 600;
                font-size: 15px;
                text-decoration: none;
                transition: transform 200ms ease, box-shadow 300ms ease;
              }
              a.homi-404-home:hover {
                transform: translateY(-1px);
                box-shadow: 0 14px 32px -8px rgba(34, 211, 238, 0.55);
              }
            `,
          }}
        />
        <a href="/" className="homi-404-home">
          Back to true north
        </a>

        <p
          style={{
            color: "#94a3b8",
            fontSize: 12,
            marginTop: 32,
            opacity: 0.5,
          }}
        >
          Error 404
        </p>
      </body>
    </html>
  );
}
