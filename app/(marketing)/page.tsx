import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { HeroSequence } from "@/components/home/HeroSequence";
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
import { heroVariant } from "@/lib/flags";

export const metadata: Metadata = {
  title: "Know When You're Ready. Move When It Matters.",
  description:
    "Credit scores look backward. HōMI looks at readiness now. Decision Readiness Intelligence™ across Financial Reality, Emotional Truth, and Perfect Timing — before life's biggest decisions.",
};

/**
 * The HōMI landing experience — a cinematic product reveal. The
 * Threshold Compass is the instrument at the center of everything;
 * the page is a private decision room, not a sales funnel.
 */
export default function MarketingHomePage() {
  return (
    <div id="main">
      <CinemaFX />

      {/* ── 1 · Opening scene — the first 8 seconds ─────────────── */}
      {heroVariant === "interview" ? <InterviewHero /> : <HeroSequence />}

      {/* ── 1b · Educational-only strip ─────────────────────────── */}
      <section className="px-6">
        <div className="glass mx-auto flex max-w-4xl items-start gap-3 !rounded-xl px-5 py-4">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
            <path d="M10 2l6 2.5v4.5c0 4.14-2.56 7.42-6 8.5-3.44-1.08-6-4.36-6-8.5V4.5L10 2z" />
            <path d="M7.5 10l1.8 1.8L12.8 8" />
          </svg>
          <p className="text-sm leading-relaxed text-dim">
            <span className="font-semibold text-emerald">Educational only — not financial advice.</span>{" "}
            HōMI provides educational guidance only. Consider consulting qualified
            professionals before making legal, tax, mortgage, investment, or real estate
            decisions.
          </p>
        </div>
      </section>

      {/* ── 1d · The statement — lit word by word by your scroll ── */}
      <section id="statement" className="hero-deep px-6 py-36 text-center sm:py-44">
        <StatementReveal />
      </section>

      {/* ── 1e · The alignment — pinned scroll cinema ───────────── */}
      <div id="compass" className="scroll-mt-24">
        <AlignmentScene />
      </div>

      {/* ── 3 · The outdated score ──────────────────────────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <Kicker>The signal that was never designed for you</Kicker>
            <h2 className="mx-auto mt-5 max-w-2xl text-center font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              A credit score tells institutions if they may trust your history.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-dim">
              HōMI helps you know if you can trust the decision.
            </p>

            <div className="glass mx-auto mt-10 max-w-2xl p-8" style={{ borderColor: "rgba(34,211,238,0.25)" }}>
              <blockquote className="font-display text-2xl leading-relaxed text-light">
                &ldquo;Most people don&rsquo;t regret what they bought. They regret when
                they bought it.&rdquo;
              </blockquote>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2">
              <div className="tilt-3d sweep rounded-2xl border border-slate-high/50 bg-navy-light/60 p-8">
                <p className="text-sm font-semibold uppercase tracking-widest text-dim">
                  Credit score
                </p>
                <ul className="mt-6 space-y-3.5 text-[15px] text-dim">
                  <li className="flex items-center gap-3"><Dash /> Past-facing</li>
                  <li className="flex items-center gap-3"><Dash /> Delayed</li>
                  <li className="flex items-center gap-3"><Dash /> Institution-first</li>
                  <li className="flex items-center gap-3"><Dash /> Narrow</li>
                  <li className="flex items-center gap-3"><Dash /> History-based</li>
                </ul>
              </div>
              <div className="glass tilt-3d sweep p-8" style={{ borderColor: "rgba(34,211,238,0.3)" }}>
                <p className="text-sm font-semibold uppercase tracking-widest text-cyan">
                  HōMI-Score
                </p>
                <ul className="mt-6 space-y-3.5 text-[15px] text-light">
                  <li className="flex items-center gap-3"><Dot c="#22d3ee" /> Live</li>
                  <li className="flex items-center gap-3"><Dot c="#34d399" /> Contextual</li>
                  <li className="flex items-center gap-3"><Dot c="#facc15" /> Consumer-first</li>
                  <li className="flex items-center gap-3"><Dot c="#22d3ee" /> Three-dimensional</li>
                  <li className="flex items-center gap-3"><Dot c="#34d399" /> Readiness-based</li>
                </ul>
              </div>
            </div>

            <p className="mx-auto mt-10 max-w-xl text-center text-dim">
              The credit score tells the world what happened. The HōMI-Score tells you
              what is ready.
            </p>
          </div>
        </section>
      </Reveal>

      {/* ── 3b · The wrong question ─────────────────────────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-4xl">
            <Kicker>The human problem</Kicker>
            <h2 className="mt-5 text-center font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              Everyone asks the wrong question.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-dim">
              Major decisions are pressure, timing, and alignment problems — not just math.
            </p>

            <div className="glass mt-12 overflow-hidden !rounded-2xl">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-high/50 bg-navy-light/60 text-xs uppercase tracking-widest text-dim">
                    <th className="px-6 py-4 font-semibold">System</th>
                    <th className="px-6 py-4 font-semibold">Question it asks</th>
                    <th className="hidden px-6 py-4 font-semibold sm:table-cell">What gets missed</th>
                  </tr>
                </thead>
                <tbody>
                  <WrongRow system="Lenders" asks="Can you afford the payment?" missed="Will you be okay after the decision?" />
                  <WrongRow system="Calculators" asks="What's the monthly cost?" missed="Emergency buffer, emotional readiness, timing risk." />
                  <WrongRow system="Marketplaces" asks="How do we move you forward?" missed="Whether forward is the right direction right now." />
                  <tr className="border-l-2 border-cyan bg-cyan/5">
                    <td className="px-6 py-5 font-bold">
                      <span style={{ color: "#22d3ee" }}>H</span>
                      <span style={{ color: "#34d399" }}>ō</span>
                      <span style={{ color: "#facc15" }}>M</span>
                      <span style={{ color: "#22d3ee" }}>I</span>
                    </td>
                    <td className="px-6 py-5 font-medium text-light">Will you be okay?</td>
                    <td className="hidden px-6 py-5 font-medium text-emerald sm:table-cell">
                      Nothing — the whole-person readiness question.
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
            <h2 className="mt-5 font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              Most systems arrive after you decide.
            </h2>
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
              <h2 className="mt-4 font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
                Your Decision Companion
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-dim">
                HōMI evaluates readiness across Financial Reality, Emotional Truth, and
                Perfect Timing — then gives you a clear verdict and a build-first path
                when you&rsquo;re not there yet.
              </p>
              <p className="mt-4 font-semibold text-cyan">
                Everyone else tells you how. HōMI tells you if.
              </p>
              <p className="mt-3 text-sm italic text-dim/80">
                We measure readiness, not affordability. We validate emotions, not
                suppress them.
              </p>
            </div>

            <div className="glass p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-yellow">
                What HōMI is not
              </p>
              <div className="mt-5 space-y-5">
                <div>
                  <p className="font-semibold text-light">Not a lender or broker</p>
                  <p className="mt-1 text-sm text-dim">No loans originated, no transactions pushed.</p>
                </div>
                <div className="hairline" />
                <div>
                  <p className="font-semibold text-light">Not a credit bureau</p>
                  <p className="mt-1 text-sm text-dim">A different question than repayment risk.</p>
                </div>
                <div className="hairline" />
                <div>
                  <p className="font-semibold text-light">Not financial advice</p>
                  <p className="mt-1 text-sm text-dim">Educational decision-readiness guidance only.</p>
                </div>
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
            <h2 className="mx-auto mt-5 max-w-2xl text-center font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              History is static. Readiness is live.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-dim">
              Move the signals. Watch the instrument answer.
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
            <Kicker color="#34d399">The verdict spectrum</Kicker>
            <h2 className="mt-5 text-center font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              Four verdicts. Zero judgment.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-dim">
              Cool means clear. Hot means stop. HōMI never blurs the line to make you
              feel better.
            </p>

            <div className="glass mt-12 p-8">
              <div className="spectrum-bar" role="img" aria-label="Verdict spectrum from NOT YET (hot) through BUILD FIRST and ALMOST THERE to READY (cool)" />
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <SpectrumChip color="#34d399" label="READY" range="80–100" temp="Cool" />
                <SpectrumChip color="#facc15" label="ALMOST THERE" range="65–79" temp="Warm" />
                <SpectrumChip color="#fab633" label="BUILD FIRST" range="50–64" temp="Warm+" />
                <SpectrumChip color="#f24822" label="NOT YET" range="0–49" temp="Hot" />
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
            <h2 className="mt-5 text-center font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              One companion. Six ways of telling the truth.
            </h2>
            <div className="mt-14">
              <Voices />
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── 14 · Your Build First path ──────────────────────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-3xl">
            <Kicker color="#fab633">After your verdict</Kicker>
            <h2 className="mt-5 text-center font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              Your Build First path.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-dim">
              When you&rsquo;re not ready yet, HōMI shows what to build first.
            </p>

            <div className="glass mt-12 p-8" style={{ borderColor: "rgba(250,182,51,0.3)" }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber">Sample verdict</p>
                  <p className="mt-0.5 text-xs text-dim/70">Illustration only — not your score</p>
                </div>
                <div className="text-right">
                  <p className="score-numeral text-4xl font-bold text-light">52</p>
                  <p className="text-xs font-bold tracking-wide text-amber">BUILD FIRST</p>
                </div>
              </div>
              <div className="hairline my-6" />
              <p className="text-sm font-semibold text-light">Build first — prioritized actions</p>
              <ol className="mt-4 space-y-3">
                <BuildStep n="01" text="Build your emergency fund toward 6 months of expenses." />
                <BuildStep n="02" text="Bring your debt-to-income ratio below 36%." />
                <BuildStep n="03" text="Push your credit score above 700." />
              </ol>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── 15 · Permissioned readiness summary ─────────────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <Kicker color="#fab633">Platform vision · Preview</Kicker>
            <h2 className="mx-auto mt-5 max-w-2xl text-center font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              Permissioned Readiness Summary
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-dim">
              Businesses do not need another way to rush people forward. They need a
              clearer signal before pressure becomes regret.
            </p>

            <div className="glass tilt-3d sweep mx-auto mt-12 max-w-lg p-8">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-dim">Readiness summary</span>
                <span className="rounded-full border border-emerald/40 bg-emerald/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald">
                  Consumer-authorized
                </span>
              </div>
              <div className="hairline my-5" />
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-dim">HōMI-Score</p>
                  <p className="score-numeral text-5xl font-bold text-light">76</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-yellow/40 bg-yellow/10 px-4 py-1.5 text-sm font-bold text-yellow">
                  ALMOST THERE <span className="font-normal opacity-70">· Warm</span>
                </span>
              </div>
              <div className="mt-6 space-y-3 text-sm">
                <Row k="Primary signal" v="Timing is close. Monthly pressure is still warm." />
                <Row k="Shared with" v="Partner preview" />
                <Row k="Readiness receipt" v="Verified" accent="#34d399" />
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
            <h2 className="mt-5 font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              Home is the first threshold.
              <span className="block text-dim">Not the whole company.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-dim">
              Homebuying is where HōMI begins because it is emotional, expensive,
              high-pressure, and often mistimed. It is the hardest room to be honest in —
              so that is where the honest voice starts.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <Kicker>Platform vision</Kicker>
            <h2 className="mx-auto mt-5 max-w-2xl text-center font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              The next score is not about the past.
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

      {/* ── 17 · Zero conflict ──────────────────────────────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <Kicker color="#34d399">Why you can trust the answer</Kicker>
            <h2 className="mt-5 text-center font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              Zero conflict of interest. Finally.
            </h2>
            <p className="text-center font-display text-3xl sm:text-4xl text-light mt-8">
              Built to say <span className="text-aurora">not yet</span>.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              <Proof title="No commissions" body="Nobody at HōMI earns a cent when you transact. Nobody ever will." />
              <Proof title="No referral fees" body="We don't hand you to a lender, an agent, or a product. There is no chain behind the curtain." />
              <Proof title="No push" body="Every other platform profits when you say yes. HōMI profits when you're ready." />
            </div>
            <p className="mx-auto mt-10 max-w-lg text-center text-sm text-dim/80">
              HōMI provides educational decision-readiness guidance only.
            </p>
            <p className="mt-8 text-center font-display text-xl text-light">
              &ldquo;The friend who says: I love you, but you&rsquo;re not ready yet — and
              then helps you get there.&rdquo;
            </p>
            <p className="mt-4 text-center text-xs uppercase tracking-widest text-dim/70">
              — HOMI TECHNOLOGIES LLC
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

      {/* ── 18 · The final threshold ────────────────────────────── */}
      <Reveal>
        <section className="hero-field px-6 py-28 text-center">
          <div className="mx-auto flex max-w-3xl flex-col items-center">
            <div className="compass-float">
              <Compass3D size={240} verdict="READY" maxTilt={6} />
            </div>
            <div
              className="mt-12 w-full rounded-3xl p-10 sm:p-14"
              style={{
                border: "1px solid transparent",
                background:
                  "linear-gradient(rgba(10,22,40,0.85), rgba(10,22,40,0.85)) padding-box, linear-gradient(120deg, rgba(250,204,21,0.55), rgba(52,211,153,0.55)) border-box",
              }}
            >
              <h2 className="font-display text-4xl font-semibold leading-tight text-light sm:text-5xl">
                Not yet is not <span className="text-emerald">no</span>.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-dim">
                It means you have time to build. And HōMI will show you exactly what to
                build first. Before the next major decision, know where you stand.
              </p>
              <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link href="/shadow-score" className="btn btn-primary btn-glow px-9 py-4 text-base">
                  Start Your Free Assessment
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M2 8h11m0 0L9 4m4 4l-4 4" />
                  </svg>
                </Link>
                <a href="#compass" className="btn btn-ghost px-8 py-3.5 text-base">
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

function Kicker({ children, color = "#22d3ee" }: { children: React.ReactNode; color?: string }) {
  return (
    <p className="text-center text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color }}>
      {children}
    </p>
  );
}

function KickerLeft({ children, color = "#22d3ee" }: { children: React.ReactNode; color?: string }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.3em]" style={{ color }}>
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

function SpectrumChip({ color, label, range, temp }: { color: string; label: string; range: string; temp: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold tracking-wide"
      style={{ color, borderColor: `${color}55`, background: `${color}10` }}
    >
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
      {label}
      <span className="score-numeral font-medium opacity-80">{range}</span>
      <span className="font-normal opacity-60">· {temp}</span>
    </span>
  );
}

function BuildStep({ n, text }: { n: string; text: string }) {
  return (
    <li className="flex items-start gap-3 text-sm text-light">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber/50" aria-hidden>
        <svg className="h-3 w-3 text-amber" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
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
      <span className="text-right font-medium" style={{ color: accent ?? "#e2e8f0" }}>
        {v}
      </span>
    </div>
  );
}

function Proof({ title, body }: { title: string; body: string }) {
  return (
    <div className="glass glass-hover p-7">
      <h3 className="text-lg font-bold text-light">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-dim">{body}</p>
    </div>
  );
}
