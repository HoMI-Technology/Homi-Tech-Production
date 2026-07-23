import { ImageResponse } from "next/og";

export const alt = "HōMI — Decision Readiness Intelligence™";
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export default function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #0a1628 0%, #071120 55%, #040b16 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Atmospheric radial glows */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 600,
            height: 600,
            background: "radial-gradient(circle, rgba(34,211,238,0.18) 0%, transparent 65%)",
            borderRadius: "50%",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -120,
            left: -80,
            width: 500,
            height: 500,
            background: "radial-gradient(circle, rgba(52,211,153,0.10) 0%, transparent 65%)",
            borderRadius: "50%",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
            gap: 20,
          }}
        >
          {/* HōMI wordmark */}
          <div
            style={{
              fontSize: 88,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              background: "linear-gradient(100deg, #e2e8f0 10%, #22d3ee 42%, #34d399 62%, #e2e8f0 92%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
              lineHeight: 1.1,
            }}
          >
            HōMI
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: 34,
              fontWeight: 600,
              color: "#e2e8f0",
              letterSpacing: "0.01em",
              lineHeight: 1.3,
              textAlign: "center",
              maxWidth: 800,
            }}
          >
            Decision Readiness Intelligence™
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: 22,
              color: "#94a3b8",
              lineHeight: 1.4,
              textAlign: "center",
              maxWidth: 700,
              marginTop: 4,
            }}
          >
            Know when you&apos;re ready — across Financial Reality, Emotional Truth, and Perfect Timing.
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: 44,
            left: 80,
            right: 80,
            height: 3,
            background: "linear-gradient(90deg, transparent, #22d3ee, #34d399, transparent)",
            borderRadius: 999,
          }}
        />
      </div>
    ),
    {
      ...size,
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    },
  );
}
