import type { Metadata } from "next";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { COLORS, VERDICT_META, type VerdictKey } from "@/lib/brand";
import { ShareViewPing } from "@/components/share/ShareViewPing";

/**
 * Public journey-card page for anonymous Shadow Score shares (00021).
 * Identity-free by construction: the row carries derived values only. The
 * page is deliberately noindex — personal readiness signals must never enter
 * a search index, even pseudonymously. The CTA carries a share-scoped ref so
 * the attribution layer can measure the viral loop (K-factor) end to end.
 */

interface ShadowShareRow {
  token: string;
  score: number;
  verdict: VerdictKey;
  financial_pct: number;
  emotional_pct: number;
  timing_pct: number;
  reveal_score: boolean;
  expires_at: string;
}

async function loadShare(token: string): Promise<ShadowShareRow | null> {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const service = createAdminClient();
  if (!service) return null;
  const { data } = await service
    .from("shadow_shares")
    .select(
      "token, score, verdict, financial_pct, emotional_pct, timing_pct, reveal_score, expires_at",
    )
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  return (data as ShadowShareRow | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const share = await loadShare(token);
  return {
    title: share ? "A readiness journey on HōMI" : "HōMI · Know When You're Ready",
    description:
      "Financial Reality. Emotional Truth. Perfect Timing. See where someone stands on the road to READY — then get your own honest read in 90 seconds.",
    robots: { index: false, follow: false },
  };
}

const PILLAR_BARS: Array<{
  key: "financial_pct" | "emotional_pct" | "timing_pct";
  label: string;
  color: string;
}> = [
  { key: "financial_pct", label: "Financial Reality", color: COLORS.cyan },
  { key: "emotional_pct", label: "Emotional Truth", color: COLORS.emerald },
  { key: "timing_pct", label: "Perfect Timing", color: COLORS.yellow },
];

export default async function ShadowSharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const share = await loadShare(token);

  if (!share) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-16">
        <div className="glass w-full max-w-md p-10 text-center">
          <h1 className="font-display text-2xl font-semibold text-light">
            This journey card has expired
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-dim">
            Share links live for 30 days. The readiness behind them keeps moving — get your own
            honest read in 90 seconds.
          </p>
          <Link href="/shadow-score" className="btn btn-primary mt-6 inline-block">
            Get your Shadow Score
          </Link>
        </div>
      </main>
    );
  }

  const meta = VERDICT_META[share.verdict];
  const refCode = `sh_${share.token.slice(0, 8)}`;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <ShareViewPing kind="shadow" />
      <div className="w-full max-w-lg">
        <div className="glass p-8 md:p-10">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan">
            Readiness journey · via HōMI
          </p>
          <h1 className="mt-3 font-display text-2xl font-semibold text-light md:text-3xl">
            {share.reveal_score ? (
              <>
                Reading: <span style={{ color: meta.color }}>{meta.label}</span>
              </>
            ) : (
              "Building toward READY"
            )}
          </h1>
          {share.reveal_score && (
            <p className="score-numeral mt-2 text-5xl font-bold text-light">{share.score}</p>
          )}

          <div className="mt-8 space-y-5">
            {PILLAR_BARS.map((pillar) => (
              <div key={pillar.key}>
                <div className="flex items-center justify-between text-xs font-medium">
                  <span className="text-light">{pillar.label}</span>
                  <span className="text-dim">{share[pillar.key]}%</span>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-slate-surface/60"
                  role="img"
                  aria-label={`${pillar.label}: ${share[pillar.key]} percent`}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${share[pillar.key]}%`, backgroundColor: pillar.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-sm leading-relaxed text-dim">
            Three pillars. One honest verdict. No sales pitch — HōMI tells people <em>if</em>{" "}
            they&rsquo;re ready for a big decision, not just how to finance it.
          </p>

          <Link
            href={`/shadow-score?ref=${refCode}`}
            className="btn btn-primary btn-glow mt-6 inline-block"
          >
            Get your own reading — 90 seconds
          </Link>
        </div>
        <p className="mt-4 text-center text-xs text-dim">
          Shared by its owner · expires automatically · nothing personal is shown
        </p>
      </div>
    </main>
  );
}
