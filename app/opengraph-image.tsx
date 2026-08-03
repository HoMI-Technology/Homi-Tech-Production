import { ImageResponse } from "next/og";
import { COLORS } from "@/lib/brand";
import { SITE_URL } from "@/lib/seo/site";

export const alt = "HōMI — Decision Readiness Intelligence™";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
          background: `linear-gradient(160deg, ${COLORS.navy} 0%, #071120 55%, #040b16 100%)`,
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
            gap: 24,
          }}
        >
          {/* HōMI wordmark */}
          <div
            style={{
              fontSize: 96,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              background: `linear-gradient(100deg, ${COLORS.light} 10%, ${COLORS.cyan} 42%, ${COLORS.emerald} 62%, ${COLORS.light} 92%)`,
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
              fontSize: 36,
              fontWeight: 600,
              color: COLORS.light,
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
              fontSize: 24,
              color: COLORS.dim,
              lineHeight: 1.4,
              textAlign: "center",
              maxWidth: 700,
              marginTop: 8,
            }}
          >
            Know when you&apos;re ready — across Financial Reality, Emotional Truth, and Perfect Timing.
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: 80,
            right: 80,
            height: 3,
            background: `linear-gradient(90deg, transparent, ${COLORS.cyan}, ${COLORS.emerald}, transparent)`,
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
