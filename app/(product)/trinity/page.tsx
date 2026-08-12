"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { COLORS, VERDICT_META } from "@/lib/brand";
import { useLatestAssessment } from "@/hooks/use-latest-assessment";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { PageFrame } from "@/components/operate/PageFrame";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";

interface TrinityResult {
  advocate: string;
  skeptic: string;
  arbiter: string;
  alignment: string;
}

const COLUMNS: Array<{
  key: "advocate" | "skeptic" | "arbiter";
  title: string;
  subtitle: string;
  color: string;
  borderClass: string;
}> = [
  {
    key: "advocate",
    title: "The Advocate",
    subtitle: "The strongest case for moving forward",
    color: COLORS.emerald,
    borderClass: "border-emerald/40",
  },
  {
    key: "skeptic",
    title: "The Skeptic",
    subtitle: "The strongest case for waiting",
    color: COLORS.crimson,
    borderClass: "border-crimson/40",
  },
  {
    key: "arbiter",
    title: "The Arbiter",
    subtitle: "Synthesis, and what would change the answer",
    color: COLORS.cyan,
    borderClass: "border-cyan/40",
  },
];

export default function TrinityPage() {
  const pathname = usePathname();
  const { assessment: stored } = useLatestAssessment();
  const [trinity, setTrinity] = useState<TrinityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gateCta, setGateCta] = useState<{ href: string; label: string } | null>(null);

  async function runTrinity() {
    if (!stored) return;
    setLoading(true);
    setError(null);
    setGateCta(null);
    try {
      const res = await fetch("/api/trinity", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          assessment: {
            score: stored.result.score,
            verdict: stored.result.verdict,
            pillars: {
              financial: stored.result.financial.total,
              emotional: stored.result.emotional.total,
              timing: stored.result.timing.total,
            },
            hardStops: stored.result.hardStops.map((h) => h.message),
          },
        }),
      });
      if (!res.ok) {
        // The companion gate returns truthful, on-brand copy (sign-in / upgrade /
        // retry) — never let a 401/402 fall through to the generic error.
        const data = (await res.json().catch(() => ({}))) as { error?: unknown };
        const message =
          typeof data.error === "string"
            ? data.error
            : "Something went wrong running the Trinity. Please try again.";
        setError(message);
        if (res.status === 401) {
          setGateCta({
            href: `/auth/sign-in?next=${encodeURIComponent(pathname)}`,
            label: "Sign in",
          });
        } else if (res.status === 402) {
          setGateCta({ href: "/pricing", label: "See plans" });
        }
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { trinity: TrinityResult };
      setTrinity(data.trinity);
    } catch {
      setError("Something went wrong running the Trinity. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (stored === undefined) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24">
        <ProductLoadingSkeleton label="Loading Trinity Engine" />
      </div>
    );
  }

  if (stored === null) {
    return (
      <div className="mx-auto max-w-xl px-6 py-24 text-center">
        <div className="glass p-10">
          <ThresholdCompass size={96} verdict="ALMOST_THERE" className="mx-auto" />
          <h1 className="mt-6 font-display text-2xl font-semibold text-light">No results yet</h1>
          <p className="mt-3 text-sm text-dim">
            The Trinity Engine analyzes your real numbers from three angles — but it needs your
            assessment first.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/shadow-score" className="btn btn-primary">
              Get your Shadow Score
            </Link>
            <Link href="/assessment" className="btn btn-ghost">
              Take the full assessment
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const meta = VERDICT_META[stored.result.verdict];

  return (
    <PageFrame width="focus" density="spacious" role="personal">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-light">Trinity Engine</h1>
          <p className="mt-2 max-w-2xl text-dim">
            Three-perspective analysis of your readiness — the case for going, the case for waiting,
            and the honest synthesis of both.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ThresholdCompass size={48} verdict={stored.result.verdict} glow={false} />
          <div>
            <p className="score-numeral text-xl font-bold text-light">{stored.result.score}</p>
            <p className="text-xs" style={{ color: meta.color }}>
              {meta.label}
            </p>
          </div>
        </div>
      </div>

      {!trinity && (
        <div className="glass mt-8 flex flex-col items-center gap-4 p-10 text-center">
          <p className="max-w-md text-sm text-dim">
            Run the Trinity to see the strongest honest case for moving forward, the strongest
            honest case for waiting, and a synthesis of both grounded in your real numbers.
          </p>
          <button type="button" onClick={runTrinity} disabled={loading} className="btn btn-primary">
            {loading ? "Convening the Trinity…" : "Run the Trinity"}
          </button>
          {error && <p className="text-sm text-crimson">{error}</p>}
          {gateCta && (
            <Link href={gateCta.href} className="btn btn-primary">
              {gateCta.label}
            </Link>
          )}
        </div>
      )}

      {trinity && (
        <>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {COLUMNS.map((col) => (
              <div
                key={col.key}
                className={`glass border ${col.borderClass} flex flex-col gap-3 p-6`}
              >
                <p
                  className="text-sm font-semibold uppercase tracking-wide"
                  style={{ color: col.color }}
                >
                  {col.title}
                </p>
                <p className="text-xs text-dim">{col.subtitle}</p>
                <div className="hairline" />
                <p className="text-sm leading-relaxed text-light">{trinity[col.key]}</p>
              </div>
            ))}
          </div>

          <div className="glass mt-6 p-6 text-center">
            <p className="text-sm font-semibold text-light">{trinity.alignment}</p>
          </div>

          <div className="mt-8 flex justify-center">
            <button type="button" onClick={runTrinity} disabled={loading} className="btn btn-ghost">
              {loading ? "Convening the Trinity…" : "Run again"}
            </button>
          </div>
          {error && <p className="mt-3 text-center text-sm text-crimson">{error}</p>}
          {gateCta && (
            <div className="mt-3 flex justify-center">
              <Link href={gateCta.href} className="btn btn-primary">
                {gateCta.label}
              </Link>
            </div>
          )}
        </>
      )}
    </PageFrame>
  );
}
