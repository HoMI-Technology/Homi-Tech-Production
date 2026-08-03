import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { VERDICT_META, type VerdictKey } from "@/lib/brand";

export const runtime = "nodejs";
export const alt = "HōMI readiness journey card";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Dynamic unfurl card for shadow shares — this IS the viral artifact: what
 * iMessage/Slack/X render when a journey link is pasted. Values come from the
 * server-computed row (unforgeable); layout follows brand canon (navy surface,
 * pillar colors, wordmark spans). Journey variant by default; score + verdict
 * only when the creator opted in.
 */

interface ShadowShareRow {
  score: number;
  verdict: VerdictKey;
  financial_pct: number;
  emotional_pct: number;
  timing_pct: number;
  reveal_score: boolean;
}

const PILLARS: Array<{ key: keyof ShadowShareRow; label: string; color: string }> = [
  { key: "financial_pct", label: "FINANCIAL REALITY", color: "#22d3ee" },
  { key: "emotional_pct", label: "EMOTIONAL TRUTH", color: "#34d399" },
  { key: "timing_pct", label: "PERFECT TIMING", color: "#facc15" },
];

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let share: ShadowShareRow | null = null;
  if (/^[a-f0-9]{32}$/.test(token)) {
    const service = createAdminClient();
    if (service) {
      const { data } = await service
        .from("shadow_shares")
        .select("score, verdict, financial_pct, emotional_pct, timing_pct, reveal_score")
        .eq("token", token)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      share = (data as ShadowShareRow | null) ?? null;
    }
  }

  const headline = share
    ? share.reveal_score
      ? VERDICT_META[share.verdict].label
      : "BUILDING TOWARD READY"
    : "KNOW WHEN YOU'RE READY";
  const headlineColor = share?.reveal_score ? VERDICT_META[share.verdict].color : "#e2e8f0";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#0a1628",
          padding: "64px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
            <span style={{ color: "#22d3ee" }}>H</span>
            <span style={{ color: "#34d399" }}>ō</span>
            <span style={{ color: "#facc15" }}>M</span>
            <span style={{ color: "#22d3ee" }}>I</span>
          </div>
          <div style={{ display: "flex", color: "#94a3b8", fontSize: 22, letterSpacing: 4 }}>
            READINESS JOURNEY
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 28,
              color: headlineColor,
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            {headline}
            {share?.reveal_score ? (
              <span style={{ color: "#ffffff", fontSize: 96 }}>{share.score}</span>
            ) : null}
          </div>

          <div style={{ display: "flex", flexDirection: "column", marginTop: 44, gap: 26 }}>
            {PILLARS.map((pillar) => {
              const pct = share ? Number(share[pillar.key]) : 62;
              return (
                <div key={pillar.label} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "#94a3b8",
                      fontSize: 20,
                      letterSpacing: 3,
                    }}
                  >
                    <span>{pillar.label}</span>
                    <span style={{ color: "#e2e8f0" }}>{share ? `${pct}%` : ""}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      width: "100%",
                      height: 14,
                      backgroundColor: "#1e293b",
                      borderRadius: 999,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: `${pct}%`,
                        height: 14,
                        backgroundColor: pillar.color,
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 22 }}>
          <span>Not a lender. Not a pitch. An honest read.</span>
          <span style={{ color: "#22d3ee" }}>homitechnology.com</span>
        </div>
      </div>
    ),
    size,
  );
}
