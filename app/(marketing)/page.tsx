import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { InterviewHero } from "@/components/home/InterviewHero";
import { TimelineShift } from "@/components/home/TimelineShift";
import { ThresholdPreview } from "@/components/home/ThresholdPreview";
import { VerdictShift } from "@/components/home/VerdictShift";
import { Voices } from "@/components/home/Voices";
import { DecisionOrbit } from "@/components/home/DecisionOrbit";
import { CinemaFX } from "@/components/home/CinemaFX";
import { Compass3D } from "@/components/home/Compass3D";
import { Flashlight } from "@/components/home/Flashlight";
import { AlignmentScene } from "@/components/home/AlignmentScene";
import { StatementReveal } from "@/components/home/StatementReveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/schema";
import { COLORS, withAlpha } from "@/lib/brand";
import { SITE_URL } from "@/lib/seo/site";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";
import { PRIMARY_CLOSE_HREF } from "@/components/marketing/first-moment-copy";

export const metadata: Metadata = {
  title: "Know When You're Ready — Decision Readiness Intelligence™",
  description:
    "A credit score estimates repayment risk. HōMI helps you evaluate readiness for the decision itself — across Financial Reality, Emotional Truth, and Perfect Timing.",
  alternates: { canonical: "/" },
};

interface WrongRowData {
  system: string;
  asks: string;
  missed: string;
}

interface TitledBody {
  title: string;
  body: string;
}

/**
 * The HōMI landing experience — a cinematic product reveal. The
 * Threshold Compass is the instrument at the center of everything;
 * the page is a private decision room, not a sales funnel.
 *
 * Copy is inlined English (i18n message catalogs removed). Homepage theater
 * uses temperature only. The four verdict badges stay on /results.
 * Never present a fake 0–100 HōMI-Score as the visitor's score.
 */
export default function MarketingHomePage() {
  const scoreLeft: string[] = [
    "Repayment risk",
    "Institution-first",
    "Credit history",
    "Lender criteria",
  ];
  const scoreRight: string[] = [
    "Decision readiness",
    "Consumer-first",
    "Three dimensions",
    "Your circumstances",
  ];
  const wrongRows: WrongRowData[] = [
    {
      system: "Lenders",
      asks: "Can you afford the payment?",
      missed: "Will you be okay after the decision?",
    },
    {
      system: "Calculators",
      asks: "What’s the monthly cost?",
      missed: "Emergency buffer, emotional readiness, timing risk.",
    },
    {
      system: "Marketplaces",
      asks: "How do we move you forward?",
      missed: "Whether forward is the right direction right now.",
    },
  ];
  const notItems: TitledBody[] = [
    {
      title: "Not a lender or broker",
      body: "No loans originated, no transactions pushed.",
    },
    {
      title: "Not a credit bureau",
      body: "A different question than repayment risk.",
    },
    {
      title: "Not financial advice",
      body: "Educational decision-readiness guidance only.",
    },
  ];
  const buildSteps: string[] = [
    "Keep at least one month of expenses set aside — under one month is a hard stop.",
    "Stay at or under the 50% DTI hard stop. Comfort tiers (28 / 33 / 36) are educational, not a HōMI path target.",
    "Credit below 620, or housing above 45% of gross, each force a hard stop.",
  ];
  const proofs: TitledBody[] = [
    {
      title: "No commissions",
      body: "HōMI does not earn commissions or referral fees when you transact.",
    },
    {
      title: "No referral fees",
      body: "We don’t hand you to a lender, an agent, or a product. There is no chain behind the curtain.",
    },
    {
      title: "No push",
      body: "HōMI’s revenue comes from subscriptions, not from whether you proceed.",
    },
  ];

  return (
    <div>
      <JsonLd data={organizationJsonLd(SITE_URL, "/icon-512-v2.png")} />
      <JsonLd data={websiteJsonLd(SITE_URL)} />
      <CinemaFX />

      {/* ── 1 · Opening scene — the first 8 seconds ─────────────── */}
      <InterviewHero />

      {/* ── 1b · Educational-only strip (quiet trust, not a second hero) ── */}
      <section className="border-t border-white/[0.04] px-6 py-5">
        <p className="mx-auto max-w-3xl text-center text-xs leading-relaxed text-dim sm:text-sm">
          <span className="font-medium text-emerald/90">
            Educational only &mdash; not financial advice.
          </span>{" "}
          HōMI provides educational guidance only. Consider consulting qualified professionals
          before making legal, tax, mortgage, investment, or real estate decisions.
        </p>
      </section>

      {/* ── 1d · The statement — lit word by word by your scroll ── */}
      <section id="statement" className="hero-deep px-6 py-36 text-center sm:py-44">
        <StatementReveal />
      </section>

      {/* ── 1e · The alignment — pinned scroll cinema ───────────── */}
      <div id="compass" className="scroll-mt-24">
        <AlignmentScene />
      </div>

      {/* ── 3 · The outdated score (taste: no kicker, less glass shout) ── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <h2 className="mx-auto max-w-2xl text-center type-display">
              A credit score tells institutions if they may trust your history.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-base text-dim sm:text-lg">
              HōMI helps you know if you can trust the decision.
            </p>

            <blockquote className="mx-auto mt-10 max-w-2xl border-l-2 border-cyan/50 pl-5 font-display text-xl leading-relaxed text-light">
              &ldquo;Most people don&rsquo;t regret what they bought. They regret when they bought
              it.&rdquo;
            </blockquote>

            <div className="mt-12 grid gap-4 md:grid-cols-2 md:gap-6">
              <div className="rounded-2xl border border-slate-high/40 bg-navy-light/50 p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-dim">
                  Credit score
                </p>
                <ul className="mt-5 space-y-3 text-base text-dim">
                  {scoreLeft.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Dash /> <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-cyan/25 bg-cyan/[0.04] p-6 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan">
                  HōMI Score™
                </p>
                <ul className="mt-5 space-y-3 text-base text-light">
                  {scoreRight.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mx-auto mt-8 max-w-xl text-center text-sm text-dim">
              A credit score answers a lender&rsquo;s question. HōMI helps you answer your own.
            </p>
          </div>
        </section>
      </Reveal>

      {/* ── 3b · The wrong question ─────────────────────────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-4xl">
            <Kicker>The human problem</Kicker>
            <h2 className="mt-5 text-center type-display">Everyone asks the wrong question.</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-dim">
              Major decisions are pressure, timing, and alignment problems &mdash; not just math.
            </p>

            <div className="glass mt-12 overflow-hidden !rounded-2xl">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-high/50 bg-navy-light/60 text-xs uppercase tracking-widest text-dim">
                    <th className="px-6 py-4 font-semibold">System</th>
                    <th className="px-6 py-4 font-semibold">Question it asks</th>
                    <th className="hidden px-6 py-4 font-semibold sm:table-cell">
                      What gets missed
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {wrongRows.map((row) => (
                    <WrongRow
                      key={row.system}
                      system={row.system}
                      asks={row.asks}
                      missed={row.missed}
                    />
                  ))}
                  <tr className="border-l-2 border-cyan bg-cyan/5">
                    <td className="px-6 py-5 font-bold">
                      <span style={{ color: COLORS.cyan }}>H</span>
                      <span style={{ color: COLORS.emerald }}>ō</span>
                      <span style={{ color: COLORS.yellow }}>M</span>
                      <span style={{ color: COLORS.cyan }}>I</span>
                    </td>
                    <td className="px-6 py-5 font-medium text-light">Will you be okay?</td>
                    <td className="hidden px-6 py-5 font-medium text-emerald sm:table-cell">
                      Nothing &mdash; the whole-person readiness question.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── 4 · The moment before ───────────────────────────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-4xl text-center">
            <Kicker>The category, drawn</Kicker>
            <h2 className="mt-5 type-display">Most systems arrive after you decide.</h2>
            <p className="mt-4 text-lg text-dim">HōMI enters before the commitment.</p>
            <div className="mt-14">
              <TimelineShift />
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── 5 · Your Decision Companion / what HōMI is not ──────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <KickerLeft>Decision companion</KickerLeft>
              <h2 className="mt-4 type-display">Your Decision Companion</h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-dim">
                HōMI evaluates readiness across Financial Reality, Emotional Truth, and Perfect
                Timing &mdash; then gives you a clear verdict and a build-first path when
                you&rsquo;re not there yet.
              </p>
              <p className="mt-4 font-semibold text-cyan">Readiness, not eligibility.</p>
              <p className="mt-3 text-sm italic text-dim/80">
                We measure readiness, not affordability. We validate emotions, not suppress them.
              </p>
            </div>

            <div className="glass p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-yellow">
                What HōMI is not
              </p>
              <div className="mt-5 space-y-5">
                {notItems.map((item, i) => (
                  <div key={item.title}>
                    {i > 0 && <div className="hairline mb-5" />}
                    <p className="font-semibold text-light">{item.title}</p>
                    <p className="mt-1 text-sm text-dim">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── 8 · Threshold Preview — live readiness ──────────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <Kicker>Threshold preview</Kicker>
            <h2 className="mx-auto mt-5 max-w-2xl text-center type-display">
              Your readiness can change as your circumstances change.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-dim">
              Update your information and HōMI recalculates the readiness picture using the
              information available in your assessment.
            </p>
            <div className="mt-14">
              <ThresholdPreview />
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── 9 · The verdict spectrum ────────────────────────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-4xl">
            <Kicker color={COLORS.emerald}>Temperature</Kicker>
            <h2 className="mt-5 text-center type-display">Cool means clear. Hot means stop.</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-dim">
              HōMI never blurs the line to make you feel better.
            </p>

            <div className="glass mt-12 p-8">
              <div
                className="spectrum-bar"
                role="img"
                aria-label="Temperature spectrum from hot through warm+ and warm to cool"
              />
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <SpectrumChip color={COLORS.emerald} label="Cool" />
                <SpectrumChip color={COLORS.yellow} label="Warm" />
                <SpectrumChip color={COLORS.amber} label="Warm+" />
                <SpectrumChip color={COLORS.crimson} label="Hot" />
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── 10 · Not yet is not no ──────────────────────────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <VerdictShift />
          </div>
        </section>
      </Reveal>

      {/* ── 13 · The voices around the compass ──────────────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-6xl">
            <Kicker>The companion layer</Kicker>
            <h2 className="mt-5 text-center type-display">
              One companion. Three ways to hear it.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-dim">
              Steady, Clarity, or Horizon — three ways to hear the same honest read.
            </p>
            <div className="mt-14">
              <Voices />
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── 14 · What to build first ──────────────────────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-3xl">
            <Kicker color={COLORS.amber}>After your verdict</Kicker>
            <h2 className="mt-5 text-center type-display">What to build first.</h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-dim">
              When you&rsquo;re not ready yet, HōMI shows what to build first.
            </p>

            <div className="glass mt-12 p-8" style={{ borderColor: withAlpha(COLORS.amber, 0.3) }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber">
                    Sample path
                  </p>
                  <p className="mt-0.5 text-xs text-dim/70">
                    Illustration only &mdash; not your verdict
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-3xl font-bold text-amber">Warm+</p>
                  <p className="text-xs tracking-wide text-dim">Temperature</p>
                </div>
              </div>
              <div className="hairline my-6" />
              <p className="text-sm font-semibold text-light">
                Build first &mdash; prioritized actions
              </p>
              <ol className="mt-4 space-y-3">
                {buildSteps.map((step, i) => (
                  <BuildStep key={step} n={`0${i + 1}`} text={step} />
                ))}
              </ol>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── 15 · Permissioned readiness summary ─────────────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <Kicker color={COLORS.amber}>Platform vision · Preview</Kicker>
            <h2 className="mx-auto mt-5 max-w-2xl text-center type-display">
              Permissioned Readiness Summary
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-dim">
              Businesses do not need another way to rush people forward. They need a clearer signal
              before pressure becomes regret.
            </p>

            <div className="glass tilt-3d sweep mx-auto mt-12 max-w-lg p-8">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-dim">
                  Readiness summary
                </span>
                <span className="rounded-full border border-emerald/40 bg-emerald/10 px-2.5 py-0.5 text-xs font-semibold text-emerald">
                  Consumer-authorized
                </span>
              </div>
              <div className="hairline my-5" />
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-dim">Temperature</p>
                  <p className="font-display text-5xl font-bold text-yellow">Warm</p>
                </div>
                <span className="text-xs text-dim/70">Illustration only</span>
              </div>
              <div className="mt-6 space-y-3 text-sm">
                <Row k="Primary signal" v="Timing is close. Monthly pressure is still warm." />
                <Row k="Shared with" v="Partner preview" />
                <Row k="Readiness receipt" v="Verified" accent={COLORS.emerald} />
                <Row k="Expires" v="30 days" />
              </div>
              <div className="hairline my-5" />
              <p className="text-xs leading-relaxed text-dim/70">
                Pre-application clarity, shared only with the consumer&rsquo;s permission.
                Educational guidance only.
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── 16 · Home is the first threshold + beyond ───────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Kicker>The wedge</Kicker>
            <h2 className="mt-5 type-display">
              Home is the first threshold.
              <span className="block text-dim">Not the whole company.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-dim">
              Homebuying is where HōMI begins because it is emotional, expensive, high-pressure, and
              often mistimed. It is the hardest room to be honest in &mdash; so that is where the
              honest voice starts.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <Kicker>Platform vision</Kicker>
            <h2 className="mx-auto mt-5 max-w-2xl text-center type-display">
              A different question than the one a lender asks.
              <span className="text-aurora"> It is about readiness.</span>
            </h2>
            <div className="mt-14">
              <DecisionOrbit />
            </div>
            <p className="mx-auto mt-12 max-w-xl text-center text-dim">
              The credit score became infrastructure for lender risk. HōMI is building
              infrastructure for consumer readiness.
            </p>
          </div>
        </section>
      </Reveal>

      {/* ── 17 · No transaction pressure ────────────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <Kicker color={COLORS.emerald}>Why you can trust the answer</Kicker>
            <h2 className="mt-5 text-center type-display">
              Designed without transaction pressure.
            </h2>
            <p className="mt-8 text-center type-h2">
              Built to say <span className="text-aurora">not yet</span>.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {proofs.map((p) => (
                <Proof key={p.title} title={p.title} body={p.body} />
              ))}
            </div>
            <p className="mx-auto mt-10 max-w-lg text-center text-sm text-dim/80">
              HōMI provides educational decision-readiness guidance only.
            </p>
            <p className="mt-8 text-center font-display text-xl text-light">
              &ldquo;The friend who says: I love you, but you&rsquo;re not ready yet &mdash; and
              then helps you get there.&rdquo;
            </p>
            <p className="mt-4 text-center text-xs uppercase tracking-widest text-dim/70">
              &mdash; HOMI TECHNOLOGIES LLC
            </p>
          </div>
        </section>
      </Reveal>

      {/* ── 6b · The dark room — the cursor is a torch ──────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <Flashlight />
          </div>
        </section>
      </Reveal>

      {/* ── 18 · The final threshold — waitlist capture ─────────── */}
      <Reveal>
        <section id="waitlist" className="hero-field scroll-mt-24 px-6 py-28 text-center">
          <div className="mx-auto flex max-w-3xl flex-col items-center">
            <div className="compass-float">
              <Compass3D size={240} maxTilt={6} />
            </div>
            <div
              className="mt-12 w-full rounded-3xl p-10 sm:p-14"
              style={{
                border: "1px solid transparent",
                background: `linear-gradient(${withAlpha(COLORS.navy, 0.85)}, ${withAlpha(COLORS.navy, 0.85)}) padding-box, linear-gradient(120deg, ${withAlpha(COLORS.yellow, 0.55)}, ${withAlpha(COLORS.emerald, 0.55)}) border-box`,
              }}
            >
              <p className="type-kicker text-cyan">Get notified</p>
              <h2 className="mt-4 type-display">
                Not yet is not <span className="text-emerald">no</span>.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-dim">
                Leave your email. We&rsquo;ll tell you when it&rsquo;s your turn &mdash; the truth,
                not a sales sequence.
              </p>
              <div className="mx-auto mt-10 max-w-md">
                <WaitlistForm source="landing" idPrefix="landing-waitlist" />
              </div>
              <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                <Link href={PRIMARY_CLOSE_HREF} className="btn btn-ghost px-8 py-3.5 text-base">
                  Or start a free assessment
                </Link>
                <a
                  href="#compass"
                  className="text-sm text-dim underline-offset-4 hover:text-light hover:underline"
                >
                  Explore the Compass
                </a>
              </div>
            </div>
          </div>
        </section>
      </Reveal>
    </div>
  );
}

function Kicker({ children, color = COLORS.cyan }: { children: React.ReactNode; color?: string }) {
  return (
    <p className="text-center type-kicker" style={{ color }}>
      {children}
    </p>
  );
}

function KickerLeft({
  children,
  color = COLORS.cyan,
}: {
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <p className="type-kicker" style={{ color }}>
      {children}
    </p>
  );
}

function WrongRow({ system, asks, missed }: { system: string; asks: string; missed: string }) {
  return (
    <tr className="border-b border-slate-high/30">
      <td className="px-6 py-5 font-semibold text-light">{system}</td>
      <td className="px-6 py-5 text-dim">{asks}</td>
      <td className="hidden px-6 py-5 text-dim sm:table-cell">{missed}</td>
    </tr>
  );
}

function SpectrumChip({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold tracking-wide"
      style={{ color, borderColor: `${color}55`, background: `${color}10` }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
      {label}
    </span>
  );
}

function BuildStep({ n, text }: { n: string; text: string }) {
  return (
    <li className="flex items-start gap-3 text-sm text-light">
      <span
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber/50"
        aria-hidden
      >
        <svg
          className="h-3 w-3 text-amber"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M2.5 6l2.5 2.5L9.5 4" />
        </svg>
      </span>
      <span>
        <span className="score-numeral mr-2 text-xs text-amber">{n}</span>
        {text}
      </span>
    </li>
  );
}

function Dot({ c }: { c: string }) {
  return (
    <span
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: c, boxShadow: `0 0 8px ${c}88` }}
      aria-hidden
    />
  );
}

function Dash() {
  return <span className="inline-block h-px w-4 shrink-0 bg-slate-high" aria-hidden />;
}

function Row({ k, v, accent }: { k: string; v: string; accent?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="shrink-0 text-dim">{k}</span>
      <span className="text-right font-medium" style={{ color: accent ?? COLORS.light }}>
        {v}
      </span>
    </div>
  );
}

function Proof({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass glass-hover p-7">
      <h3 className="type-h4">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-dim">{body}</p>
    </div>
  );
}
