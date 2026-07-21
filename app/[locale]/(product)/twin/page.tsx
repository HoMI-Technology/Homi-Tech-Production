"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PILLARS, VERDICT_META } from "@/lib/brand";
import { PILLAR_MAX_POINTS } from "@/lib/scoring";
import { loadLocalResult, type StoredAssessment } from "@/lib/assessment/storage";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";
import { TypedLetter } from "@/components/twin/TypedLetter";

type Horizon = "5" | "10" | "retirement";

const HORIZONS: Array<{ key: Horizon; label: string; sublabel: string }> = [
  { key: "5", label: "5 years", sublabel: "The near view" },
  { key: "10", label: "10 years", sublabel: "The mid view" },
  { key: "retirement", label: "Retirement", sublabel: "The long view" },
];

interface TwinLetter {
  salutation: string;
  paragraphs: string[];
}

function weakestPillar(result: StoredAssessment["result"]): { name: string; pct: number } {
  const totals: Record<string, number> = {
    financial: result.financial.total,
    emotional: result.emotional.total,
    timing: result.timing.total,
  };
  const entries = PILLARS.map((p) => ({
    name: p.name,
    pct: Math.round((totals[p.key] / PILLAR_MAX_POINTS[p.key]) * 100),
  }));
  return entries.sort((a, b) => a.pct - b.pct)[0];
}

export default function TwinPage() {
  const pathname = usePathname();
  const [stored, setStored] = useState<StoredAssessment | null | undefined>(undefined);
  const [horizon, setHorizon] = useState<Horizon>("10");
  const [fear, setFear] = useState("");
  const [letter, setLetter] = useState<TwinLetter | null>(null);
  const [source, setSource] = useState<"model" | "fallback" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gateCta, setGateCta] = useState<{ href: string; label: string } | null>(null);
  const [letterKey, setLetterKey] = useState(0);

  useEffect(() => {
    setStored(loadLocalResult());
  }, []);

  const weak = useMemo(() => (stored ? weakestPillar(stored.result) : null), [stored]);

  async function generateLetter() {
    if (!stored || !weak) return;
    setLoading(true);
    setError(null);
    setGateCta(null);
    try {
      const res = await fetch("/api/twin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          horizon,
          fear: fear.trim() || undefined,
          assessment: {
            score: stored.result.score,
            verdict: stored.result.verdict,
            weakestPillar: weak,
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
            : "Something went wrong generating your letter. Please try again.";
        setError(message);
        if (res.status === 401) {
          setGateCta({ href: `/auth/sign-in?next=${encodeURIComponent(pathname)}`, label: "Sign in" });
        } else if (res.status === 402) {
          setGateCta({ href: "/pricing", label: "See plans" });
        }
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { letter: TwinLetter; source: "model" | "fallback" };
      setLetter(data.letter);
      setSource(data.source);
      setLetterKey((k) => k + 1);
    } catch {
      setError("Something went wrong generating your letter. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (stored === undefined) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="text-dim">Loading your results…</p>
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
            The Temporal Twin writes to you from your future — but it needs your real numbers first.
            Get your Shadow Score to unlock it.
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
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-3xl text-light">Temporal Twin</h1>
      <p className="mt-2 max-w-2xl text-dim">
        A letter from your future self. Grounded in your actual HōMI-Score, written from the other side
        of this decision — {horizon === "retirement" ? "retirement" : `${horizon} years`} from now.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">
        {/* Controls */}
        <div className="glass flex flex-col gap-6 p-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-dim">Your current read</p>
            <div className="mt-3 flex items-center gap-3">
              <ThresholdCompass size={56} verdict={stored.result.verdict} glow={false} />
              <div>
                <p className="score-numeral text-2xl font-bold text-light">{stored.result.score}</p>
                <p className="text-xs" style={{ color: meta.color }}>
                  {meta.label}
                </p>
              </div>
            </div>
          </div>

          <div className="hairline" />

          <div>
            <p className="text-sm font-semibold text-light">Choose your horizon</p>
            <div className="mt-3 flex flex-col gap-2">
              {HORIZONS.map((h) => (
                <button
                  key={h.key}
                  type="button"
                  onClick={() => setHorizon(h.key)}
                  className={`glass-hover flex items-center justify-between rounded-[12px] border px-4 py-3 text-left transition ${
                    horizon === h.key ? "border-cyan/60 bg-cyan/10" : "border-slate-surface"
                  }`}
                >
                  <span className="text-sm font-semibold text-light">{h.label}</span>
                  <span className="text-xs text-dim">{h.sublabel}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="fear" className="text-sm font-semibold text-light">
              One fear about this decision <span className="font-normal text-dim">(optional)</span>
            </label>
            <textarea
              id="fear"
              className="input mt-2 w-full"
              rows={3}
              maxLength={400}
              placeholder="What's the one thing you're afraid of, if you're honest?"
              value={fear}
              onChange={(e) => setFear(e.target.value)}
            />
          </div>

          <button type="button" onClick={generateLetter} disabled={loading} className="btn btn-primary w-full">
            {loading ? "Writing your letter…" : letter ? "Regenerate" : "Write my letter"}
          </button>

          {error && <p className="text-sm text-crimson">{error}</p>}
          {gateCta && (
            <Link href={gateCta.href} className="btn btn-primary w-full text-center">
              {gateCta.label}
            </Link>
          )}
        </div>

        {/* Letter panel */}
        <div className="glass min-h-[420px] p-8 sm:p-12 print:bg-white print:text-black">
          {!letter && !loading && (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 text-center">
              <ThresholdCompass size={72} verdict={stored.result.verdict} />
              <p className="max-w-sm text-sm text-dim">
                Pick a horizon and write your letter. Your future self is waiting to tell you how this went.
              </p>
            </div>
          )}

          {loading && (
            <div className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-dim">Your future self is finding the words…</p>
            </div>
          )}

          {letter && !loading && (
            <div key={letterKey}>
              <p className="font-display text-2xl text-light">{letter.salutation}</p>
              <div className="mt-6">
                <TypedLetter paragraphs={letter.paragraphs} />
              </div>
              <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-surface/60 pt-6 print:hidden">
                <p className="text-xs uppercase tracking-wide text-dim">
                  {source === "model" ? "Written for you" : "A HōMI letter"}
                </p>
                <div className="flex gap-3">
                  <button type="button" onClick={generateLetter} className="btn btn-ghost !px-4 !py-2 text-sm">
                    Regenerate
                  </button>
                  <button type="button" onClick={handlePrint} className="btn btn-ghost !px-4 !py-2 text-sm">
                    Print
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
