import Link from "next/link";
import { PRIMARY_CLOSE_HREF, PRIMARY_CLOSE_LABEL } from "@/components/marketing/first-moment-copy";
import { Reveal } from "@/components/ui/Reveal";
import { PILLARS, VERDICT_META, withAlpha, type VerdictKey } from "@/lib/brand";
import { scoreToVerdict } from "@/lib/scoring/engine";
import {
  WALK_CLARITY,
  WALK_COMPANION,
  WALK_OBJECT,
  WALK_PRIMARY,
} from "@/components/home/walk-copy";

/**
 * Front-door sections — the rich guest `/` rebuilt on canon.
 * Every verdict label, color, and score range is imported or derived
 * from lib/brand and lib/scoring at render time, so this page cannot
 * drift from the engine the way the old 75/60/40 build did.
 */

/** Derive the verdict bands by probing the canonical engine mapping. */
function verdictBands(): { key: VerdictKey; min: number; max: number }[] {
  const bands = new Map<VerdictKey, { min: number; max: number }>();
  for (let score = 0; score <= 100; score++) {
    const v = scoreToVerdict(score);
    const band = bands.get(v);
    if (band) band.max = Math.max(band.max, score);
    else bands.set(v, { min: score, max: score });
  }
  return [...bands.entries()].map(([key, b]) => ({ key, ...b })).sort((a, b) => b.min - a.min);
}

function SectionHeader({
  eyebrow,
  title,
  support,
}: {
  eyebrow: string;
  title: string;
  support?: string;
}) {
  return (
    <Reveal className="line-light line-glow-cyan">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="type-display mt-4 max-w-4xl text-light" style={{ textWrap: "balance" }}>
        {title}
      </h2>
      {support ? <p className="mt-4 max-w-2xl text-lg text-dim">{support}</p> : null}
    </Reveal>
  );
}

export function FriendFrame() {
  return (
    <section className="px-5 py-[10vh] sm:px-6 lg:px-8">
      <Reveal className="line-light line-glow-cyan mx-auto w-full max-w-7xl">
        <div className="glass glass-hover mx-auto max-w-3xl p-10 text-center sm:p-14">
          <p className="eyebrow">The companion</p>
          <p className="type-display mt-5 text-ink">{WALK_COMPANION}</p>
          <p className="mt-5 text-lg text-dim">
            The honest friend in a process where everyone else is paid to say yes.
          </p>
        </div>
      </Reveal>
    </section>
  );
}

export function Pillars() {
  return (
    <section className="px-5 py-[9vh] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeader
          eyebrow="Three pillars. One protective signal."
          title={WALK_PRIMARY}
          support="Financial Reality, Emotional Truth, and Perfect Timing — measured together, never in isolation."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {PILLARS.map((pillar, i) => (
            <Reveal key={pillar.key} delay={i * 90}>
              <div className="glass glass-hover h-full p-7">
                <span
                  aria-hidden
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{
                    background: pillar.color,
                    boxShadow: `0 0 18px 4px ${withAlpha(pillar.color, 0.45)}`,
                  }}
                />
                <h3 className="mt-5 text-xl font-semibold" style={{ color: pillar.color }}>
                  {pillar.name}
                </h3>
                <p className="mt-2 text-lg text-light">{pillar.question}</p>
                <p className="mt-4 text-sm text-dim">
                  Weighted at up to <span className="score-numeral">{pillar.max}</span> of 100 in
                  your readiness score.
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function VerdictSpectrum() {
  const bands = verdictBands();
  const gradient = `linear-gradient(90deg, ${[...bands]
    .reverse()
    .map((b) => VERDICT_META[b.key].color)
    .join(", ")})`;
  return (
    <section className="px-5 py-[9vh] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeader
          eyebrow="The verdict spectrum"
          title="Four verdicts. Zero judgment."
          support="The ranges below are read live from the scoring engine — the page cannot say one thing and the score another."
        />
        <Reveal className="mt-14">
          <div className="glass p-8 sm:p-10">
            <div
              aria-hidden
              className="h-1.5 w-full rounded-full"
              style={{ background: gradient, opacity: 0.9 }}
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {bands.map((band) => {
                const meta = VERDICT_META[band.key];
                return (
                  <div
                    key={band.key}
                    className="rounded-xl border p-5"
                    style={{
                      borderColor: withAlpha(meta.color, 0.35),
                      background: withAlpha(meta.color, 0.06),
                    }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        aria-hidden
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          background: meta.color,
                          boxShadow: `0 0 12px 2px ${withAlpha(meta.color, 0.5)}`,
                        }}
                      />
                      <span className="text-sm font-semibold" style={{ color: meta.color }}>
                        {meta.label}
                      </span>
                      <span className="score-numeral ml-auto text-xs text-dim">
                        {band.min}&ndash;{band.max}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-dim">{meta.line}</p>
                  </div>
                );
              })}
            </div>
            <p className="mt-6 text-xs text-dim">
              Ranges are computed from the scoring engine at build time, never hand-written.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const STEPS = [
  {
    n: "01",
    name: "Assess",
    detail: "Structured questions across all three readiness pillars.",
  },
  {
    n: "02",
    name: "Score",
    detail: "A deterministic 0–100 readiness score — same inputs, same answer, every time.",
  },
  {
    n: "03",
    name: "Verdict",
    detail: "One of four honest verdicts. Not yet is one of them, on purpose.",
  },
  {
    n: "04",
    name: "Build",
    detail: "The map of what to build first, so a not-yet verdict has a path.",
  },
] as const;

export function Steps() {
  return (
    <section className="px-5 py-[9vh] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeader eyebrow="How it works" title="Four steps to clarity" />
        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <Reveal key={step.n} delay={i * 80}>
              <div className="glass glass-hover h-full p-7">
                <div className="flex items-baseline gap-4">
                  <span className="score-numeral text-sm text-cyan">{step.n}</span>
                  <h3 className="text-xl font-semibold text-light">{step.name}</h3>
                </div>
                <p className="mt-3 text-dim">{step.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-10">
          <Link href="/how-it-works" className="btn btn-ghost">
            See the full method
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

export function Clarity() {
  return (
    <section className="px-5 py-[9vh] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <Reveal className="line-light line-glow-emerald">
          <p className="eyebrow">Why trust the answer</p>
          <h2 className="type-display mt-4 max-w-4xl text-light">{WALK_CLARITY}</h2>
          <p className="mt-5 max-w-2xl text-lg text-dim">
            No commissions. No referral fees. Nobody here earns more when you say yes &mdash; the
            answer is the product.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export function CloseCta() {
  return (
    <section className="hero-field px-5 py-[14vh] sm:px-6 lg:px-8">
      <Reveal className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="glass mx-auto max-w-3xl p-10 text-center sm:p-14">
          <h2 className="type-display text-ink">
            Not yet is not <span className="text-emerald">no</span>.
          </h2>
          <p className="mt-5 text-lg text-dim">{WALK_OBJECT}</p>
          <Link
            href={`${PRIMARY_CLOSE_HREF}?src=close`}
            className="btn btn-primary mt-8 inline-flex"
          >
            {PRIMARY_CLOSE_LABEL}
          </Link>
          <p className="mt-4 text-sm text-dim">Free &middot; about 5 minutes</p>
        </div>
      </Reveal>
    </section>
  );
}
