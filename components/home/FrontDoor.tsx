import Link from "next/link";
import {
  PRIMARY_CLOSE_HREF,
  PRIMARY_CLOSE_LABEL_HOME,
} from "@/components/marketing/first-moment-copy";
import { Reveal } from "@/components/ui/Reveal";
import { PILLARS, VERDICT_META, withAlpha, type VerdictKey } from "@/lib/brand";
import {
  WALK_CLARITY,
  WALK_COMPANION,
  WALK_OBJECT,
  WALK_PRIMARY,
} from "@/components/home/walk-copy";

/**
 * Front-door sections — the rich guest `/` rebuilt on canon.
 * Verdict labels, colors, and meaning lines come from lib/brand. Numeric
 * score ranges and pillar weights are trade-secret and never render here:
 * the public model is qualitative only (scripts/brand-check.mjs N21/N22).
 */

/** Verdict display order — cool to hot. Qualitative only: names and meanings, no ranges. */
const VERDICT_ORDER: VerdictKey[] = ["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"];

/**
 * Public marketing labels. ADR-001's dual-stable vocabulary keeps the
 * in-product hard-stop badge "DO NOT PROCEED" (VERDICT_META is untouched);
 * the public front door renders the softer name for the fourth verdict.
 */
const PUBLIC_VERDICT_LABELS: Record<VerdictKey, string> = {
  READY: VERDICT_META.READY.label,
  ALMOST_THERE: VERDICT_META.ALMOST_THERE.label,
  BUILD_FIRST: VERDICT_META.BUILD_FIRST.label,
  NOT_YET: "NOT YET", // brand-ok: marketing-page label per 2026-08 audit fix 4 — the in-product badge keeps ADR-001's DO NOT PROCEED
};

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

const WRONG_QUESTIONS = [
  {
    system: "Lenders",
    asks: "Can you qualify?",
    misses: "Will you be okay after the decision?",
  },
  {
    system: "Calculators",
    asks: "What\u2019s the monthly payment?",
    misses: "Emergency buffer, emotional readiness, timing risk.",
  },
] as const;

export function WrongQuestion() {
  return (
    <section className="px-5 py-[9vh] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeader
          eyebrow="The human problem"
          title="Everyone asks the wrong question"
          support="Major decisions are pressure, timing, and alignment problems — not just math."
        />
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {WRONG_QUESTIONS.map((row, i) => (
            <Reveal key={row.system} delay={i * 90}>
              <div className="glass glass-hover h-full p-7">
                <p className="eyebrow">{row.system}</p>
                <p className="mt-4 text-xl font-semibold text-light">{row.asks}</p>
                <div className="hairline my-5" aria-hidden />
                <p className="text-sm text-dim">
                  What gets missed: <span className="text-light">{row.misses}</span>
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-12">
          <p className="mx-auto max-w-3xl text-center text-xl font-semibold text-light">
            A credit score tells institutions if you may repay. HōMI tells you if you are ready.
          </p>
        </Reveal>
      </div>
    </section>
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
                  No single pillar decides alone &mdash; the three are measured together, never in
                  isolation.
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
  // Canon spectrum runs cool to hot, left to right: emerald → yellow →
  // amber → crimson — the same order as the cards beneath it.
  const gradient = `linear-gradient(90deg, ${VERDICT_ORDER.map(
    (key) => VERDICT_META[key].color,
  ).join(", ")})`;
  return (
    <section className="px-5 py-[9vh] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeader
          eyebrow="The verdict spectrum"
          title="Four verdicts. Zero judgment."
          support="The same four verdicts the assessment can give you — plain names, honest meanings, no fine print."
        />
        <Reveal className="mt-14">
          <div className="glass p-8 sm:p-10">
            <div
              aria-hidden
              className="h-1.5 w-full rounded-full"
              style={{ background: gradient, opacity: 0.9 }}
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {VERDICT_ORDER.map((key) => {
                const meta = VERDICT_META[key];
                return (
                  <div
                    key={key}
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
                        {PUBLIC_VERDICT_LABELS[key]}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-dim">{meta.line}</p>
                  </div>
                );
              })}
            </div>
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

const OS_LAYERS = [
  {
    index: "01",
    label: "Signal",
    title: "Readiness scanner",
    copy: "A five-minute assessment turns Financial Reality, Emotional Truth, and Perfect Timing into one Decision Readiness Score and a protective verdict.",
    href: "/assessment",
    action: "Run the assessment",
    tint: "var(--color-cyan)",
  },
  {
    index: "02",
    label: "Instrument",
    title: "Threshold Compass",
    copy: "See which part of the decision is carrying the risk, then use readiness tools and scenarios to understand what would change the answer.",
    href: "/tools",
    action: "Explore the tools",
    tint: "var(--color-emerald)",
  },
  {
    index: "03",
    label: "Intelligence",
    title: "AI agent layer",
    copy: "Specialized companions help interpret the verdict, pressure-test tradeoffs, and keep the reasoning trail connected to your actual readiness state.",
    href: "/agents",
    action: "Meet the agents",
    tint: "var(--color-yellow)",
  },
  {
    index: "04",
    label: "Operate",
    title: "Private command center",
    copy: "Move from a one-time answer to an operating rhythm across money, plans, decisions, signals, and the next best move.",
    href: "/dashboard",
    action: "Enter the command center",
    tint: "var(--color-amber)",
  },
] as const;

/**
 * The wider product story, kept below the method so the front door remains
 * decision-first. Every destination is an existing product route; no demo
 * states or speculative capability claims are introduced here.
 */
export function DecisionOS() {
  return (
    <section className="px-5 py-[10vh] sm:px-6 lg:px-8" data-decision-os="">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeader
          eyebrow="Decision Readiness Intelligence™"
          title="One signal. A system for what comes next."
          support="HōMI connects the moment of truth to the tools, intelligence, and operating surfaces that help you act on it."
        />

        <div className="mt-14 overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-surface/45">
          <div className="grid lg:grid-cols-4">
            {OS_LAYERS.map((layer, i) => (
              <Reveal
                key={layer.index}
                delay={i * 70}
                className="group relative border-b border-white/[0.08] p-7 last:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="score-numeral text-xs text-dim">{layer.index}</span>
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{
                      background: layer.tint,
                      boxShadow: `0 0 16px ${layer.tint}`,
                    }}
                    aria-hidden
                  />
                </div>
                <p className="eyebrow mt-10" style={{ color: layer.tint }}>
                  {layer.label}
                </p>
                <h3 className="mt-3 text-xl font-semibold text-light">{layer.title}</h3>
                <p className="mt-4 min-h-24 text-sm leading-relaxed text-dim">{layer.copy}</p>
                <Link
                  href={layer.href}
                  className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-light transition-colors hover:text-cyan"
                >
                  {layer.action}
                  <span
                    aria-hidden
                    className="transition-transform duration-200 group-hover:translate-x-1"
                  >
                    &rarr;
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>

        <Reveal className="mt-8 flex flex-col gap-4 rounded-2xl border border-cyan/20 bg-cyan/[0.04] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <p className="eyebrow text-cyan">Organizations + builders</p>
            <p className="mt-2 max-w-2xl text-light">
              Bring privacy-preserving readiness intelligence into employee benefits, partner
              ecosystems, and agent-enabled products.
            </p>
          </div>
          <Link href="/b2b" className="btn btn-ghost shrink-0">
            HōMI for organizations
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

const NOT_ITEMS = [
  "Not a lender or broker.",
  "Not a credit bureau.",
  "Not a financial, legal, tax, or mortgage advisor.",
  "Not a product-pushing engine.",
] as const;

/** What HōMI is not — the boundary said plainly, between Clarity and the close. */
export function NotYourBanker() {
  return (
    <section className="px-5 py-[9vh] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <SectionHeader
          eyebrow="What HōMI is not"
          title="Your HōMI, not your banker."
          support="HōMI provides educational guidance only. The answer is the product."
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {NOT_ITEMS.map((item, i) => (
            <Reveal key={item} delay={i * 80}>
              <div className="h-full rounded-xl border border-slate-high/40 bg-slate-surface p-7">
                <p className="text-base text-dim">{item}</p>
              </div>
            </Reveal>
          ))}
        </div>
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
            {PRIMARY_CLOSE_LABEL_HOME}
          </Link>
          <p className="mt-4 text-sm text-dim">Free &middot; about 5 minutes</p>
        </div>
      </Reveal>
    </section>
  );
}
