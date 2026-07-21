import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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
import { JsonLd } from "@/components/seo/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Know When You're Ready. Move When It Matters.",
  description:
    "Credit scores look backward. HōMI looks at readiness now. Decision Readiness Intelligence™ across Financial Reality, Emotional Truth, and Perfect Timing — before life's biggest decisions.",
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
 * Copy lives in messages/{en,es}.json ("home.*"). Two things stay
 * hardcoded on purpose: the verdict labels (READY / ALMOST THERE /
 * BUILD FIRST / NOT YET — trademark-pending canon, and the
 * landing-canon tests grep this source for score/verdict pairs) and
 * the sample score numerals beside them.
 */
export default async function MarketingHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const scoreLeft = t.raw("score.leftItems") as string[];
  const scoreRight = t.raw("score.rightItems") as string[];
  const wrongRows = t.raw("wrong.rows") as WrongRowData[];
  const notItems = t.raw("companion.notItems") as TitledBody[];
  const buildSteps = t.raw("buildFirst.steps") as string[];
  const proofs = t.raw("zero.proofs") as TitledBody[];

  return (
    <div>
      <JsonLd data={organizationJsonLd(SITE_URL, "/icon-512-v2.png")} />
      <JsonLd data={websiteJsonLd(SITE_URL)} />
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
            <span className="font-semibold text-emerald">{t("edu.strong")}</span>{" "}
            {t("edu.body")}
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
            <Kicker>{t("score.kicker")}</Kicker>
            <h2 className="mx-auto mt-5 max-w-2xl text-center font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              {t("score.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-dim">
              {t("score.sub")}
            </p>

            <div className="glass mx-auto mt-10 max-w-2xl p-8" style={{ borderColor: "rgba(34,211,238,0.25)" }}>
              <blockquote className="font-display text-2xl leading-relaxed text-light">
                {t("score.quote")}
              </blockquote>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2">
              <div className="tilt-3d sweep rounded-2xl border border-slate-high/50 bg-navy-light/60 p-8">
                <p className="text-sm font-semibold uppercase tracking-widest text-dim">
                  {t("score.leftTitle")}
                </p>
                <ul className="mt-6 space-y-3.5 text-[15px] text-dim">
                  {scoreLeft.map((item) => (
                    <li key={item} className="flex items-center gap-3"><Dash /> {item}</li>
                  ))}
                </ul>
              </div>
              <div className="glass tilt-3d sweep p-8" style={{ borderColor: "rgba(34,211,238,0.3)" }}>
                <p className="text-sm font-semibold uppercase tracking-widest text-cyan">
                  {t("score.rightTitle")}
                </p>
                <ul className="mt-6 space-y-3.5 text-[15px] text-light">
                  {scoreRight.map((item, i) => (
                    <li key={item} className="flex items-center gap-3">
                      <Dot c={["#22d3ee", "#34d399", "#facc15", "#22d3ee", "#34d399"][i % 5]} /> {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="mx-auto mt-10 max-w-xl text-center text-dim">
              {t("score.foot")}
            </p>
          </div>
        </section>
      </Reveal>

      {/* ── 3b · The wrong question ─────────────────────────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-4xl">
            <Kicker>{t("wrong.kicker")}</Kicker>
            <h2 className="mt-5 text-center font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              {t("wrong.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-dim">
              {t("wrong.sub")}
            </p>

            <div className="glass mt-12 overflow-hidden !rounded-2xl">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-high/50 bg-navy-light/60 text-xs uppercase tracking-widest text-dim">
                    <th className="px-6 py-4 font-semibold">{t("wrong.colSystem")}</th>
                    <th className="px-6 py-4 font-semibold">{t("wrong.colAsks")}</th>
                    <th className="hidden px-6 py-4 font-semibold sm:table-cell">{t("wrong.colMissed")}</th>
                  </tr>
                </thead>
                <tbody>
                  {wrongRows.map((row) => (
                    <WrongRow key={row.system} system={row.system} asks={row.asks} missed={row.missed} />
                  ))}
                  <tr className="border-l-2 border-cyan bg-cyan/5">
                    <td className="px-6 py-5 font-bold">
                      <span style={{ color: "#22d3ee" }}>H</span>
                      <span style={{ color: "#34d399" }}>ō</span>
                      <span style={{ color: "#facc15" }}>M</span>
                      <span style={{ color: "#22d3ee" }}>I</span>
                    </td>
                    <td className="px-6 py-5 font-medium text-light">{t("wrong.homiAsks")}</td>
                    <td className="hidden px-6 py-5 font-medium text-emerald sm:table-cell">
                      {t("wrong.homiMissed")}
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
            <Kicker>{t("moment.kicker")}</Kicker>
            <h2 className="mt-5 font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              {t("moment.title")}
            </h2>
            <p className="mt-4 text-lg text-dim">{t("moment.sub")}</p>
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
              <KickerLeft>{t("companion.kicker")}</KickerLeft>
              <h2 className="mt-4 font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
                {t("companion.title")}
              </h2>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-dim">
                {t("companion.body")}
              </p>
              <p className="mt-4 font-semibold text-cyan">
                {t("companion.tagline")}
              </p>
              <p className="mt-3 text-sm italic text-dim/80">
                {t("companion.note")}
              </p>
            </div>

            <div className="glass p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-yellow">
                {t("companion.notTitle")}
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
            <Kicker>{t("threshold.kicker")}</Kicker>
            <h2 className="mx-auto mt-5 max-w-2xl text-center font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              {t("threshold.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-dim">
              {t("threshold.sub")}
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
            <Kicker color="#34d399">{t("spectrum.kicker")}</Kicker>
            <h2 className="mt-5 text-center font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              {t("spectrum.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-dim">
              {t("spectrum.sub")}
            </p>

            <div className="glass mt-12 p-8">
              <div className="spectrum-bar" role="img" aria-label={t("spectrum.aria")} />
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {/* Verdict labels stay English: trademark-pending canon. */}
                <SpectrumChip color="#34d399" label="READY" range="80–100" temp={t("spectrum.temps.cool")} />
                <SpectrumChip color="#facc15" label="ALMOST THERE" range="65–79" temp={t("spectrum.temps.warm")} />
                <SpectrumChip color="#fab633" label="BUILD FIRST" range="50–64" temp={t("spectrum.temps.warmPlus")} />
                <SpectrumChip color="#f24822" label="NOT YET" range="0–49" temp={t("spectrum.temps.hot")} />
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
            <Kicker>{t("voices.kicker")}</Kicker>
            <h2 className="mt-5 text-center font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              {t("voices.title")}
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
            <Kicker color="#fab633">{t("buildFirst.kicker")}</Kicker>
            <h2 className="mt-5 text-center font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              {t("buildFirst.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-center text-dim">
              {t("buildFirst.sub")}
            </p>

            <div className="glass mt-12 p-8" style={{ borderColor: "rgba(250,182,51,0.3)" }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-amber">{t("buildFirst.sample")}</p>
                  <p className="mt-0.5 text-xs text-dim/70">{t("buildFirst.illustration")}</p>
                </div>
                <div className="text-right">
                  {/* Canon-checked pair (landing-canon tests): 52 → BUILD FIRST. */}
                  <p className="score-numeral text-4xl font-bold text-light">52</p>
                  <p className="text-xs font-bold tracking-wide text-amber">BUILD FIRST</p>
                </div>
              </div>
              <div className="hairline my-6" />
              <p className="text-sm font-semibold text-light">{t("buildFirst.listTitle")}</p>
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
            <Kicker color="#fab633">{t("prs.kicker")}</Kicker>
            <h2 className="mx-auto mt-5 max-w-2xl text-center font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              {t("prs.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-dim">
              {t("prs.sub")}
            </p>

            <div className="glass tilt-3d sweep mx-auto mt-12 max-w-lg p-8">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-widest text-dim">{t("prs.summary")}</span>
                <span className="rounded-full border border-emerald/40 bg-emerald/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald">
                  {t("prs.badge")}
                </span>
              </div>
              <div className="hairline my-5" />
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-dim">HōMI-Score</p>
                  {/* Canon-checked pair (landing-canon tests): 76 → ALMOST THERE. */}
                  <p className="score-numeral text-5xl font-bold text-light">76</p>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-yellow/40 bg-yellow/10 px-4 py-1.5 text-sm font-bold text-yellow">
                  ALMOST THERE <span className="font-normal opacity-70">· {t("prs.warmTag")}</span>
                </span>
              </div>
              <div className="mt-6 space-y-3 text-sm">
                <Row k={t("prs.primarySignal")} v={t("prs.primarySignalValue")} />
                <Row k={t("prs.sharedWith")} v={t("prs.sharedWithValue")} />
                <Row k={t("prs.receipt")} v={t("prs.receiptValue")} accent="#34d399" />
                <Row k={t("prs.expires")} v={t("prs.expiresValue")} />
              </div>
              <div className="hairline my-5" />
              <p className="text-xs leading-relaxed text-dim/70">
                {t("prs.foot")}
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ── 16 · Home is the first threshold + beyond ───────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Kicker>{t("wedge.kicker")}</Kicker>
            <h2 className="mt-5 font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              {t("wedge.title")}
              <span className="block text-dim">{t("wedge.titleDim")}</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-dim">
              {t("wedge.body")}
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <Kicker>{t("vision.kicker")}</Kicker>
            <h2 className="mx-auto mt-5 max-w-2xl text-center font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              {t("vision.title")}
              <span className="text-aurora"> {t("vision.titleAccent")}</span>
            </h2>
            <div className="mt-14">
              <DecisionOrbit />
            </div>
            <p className="mx-auto mt-12 max-w-xl text-center text-dim">
              {t("vision.foot")}
            </p>
          </div>
        </section>
      </Reveal>

      {/* ── 17 · Zero conflict ──────────────────────────────────── */}
      <Reveal>
        <section className="px-6 py-24">
          <div className="mx-auto max-w-5xl">
            <Kicker color="#34d399">{t("zero.kicker")}</Kicker>
            <h2 className="mt-5 text-center font-display text-4xl font-semibold leading-tight text-light sm:text-6xl">
              {t("zero.title")}
            </h2>
            <p className="text-center font-display text-3xl sm:text-4xl text-light mt-8">
              {t("zero.bigA")} <span className="text-aurora">{t("zero.bigAccent")}</span>.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {proofs.map((p) => (
                <Proof key={p.title} title={p.title} body={p.body} />
              ))}
            </div>
            <p className="mx-auto mt-10 max-w-lg text-center text-sm text-dim/80">
              {t("zero.note")}
            </p>
            <p className="mt-8 text-center font-display text-xl text-light">
              {t("zero.quote")}
            </p>
            <p className="mt-4 text-center text-xs uppercase tracking-widest text-dim/70">
              {t("zero.attribution")}
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
                {t("final.titleA")}<span className="text-emerald">{t("final.titleAccent")}</span>{t("final.titleB")}
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-dim">
                {t("final.body")}
              </p>
              <div className="mt-9 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Link href="/shadow-score" className="btn btn-primary btn-glow px-9 py-4 text-base">
                  {t("final.primary")}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M2 8h11m0 0L9 4m4 4l-4 4" />
                  </svg>
                </Link>
                <a href="#compass" className="btn btn-ghost px-8 py-3.5 text-base">
                  {t("final.secondary")}
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
