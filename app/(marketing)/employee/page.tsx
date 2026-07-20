import Link from "next/link";
import type { Metadata } from "next";
import { Reveal } from "@/components/ui/Reveal";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";

export const metadata: Metadata = {
  // Rendered through the "%s · HōMI" root template — don't repeat the brand.
  title: "For Employees",
  description:
    "The financial-wellness benefit that tells your people the truth. Privacy-first readiness for the big decisions life throws at your workforce.",
  alternates: { canonical: "/employee" },
};

const OUTCOMES = [
  {
    title: "Less financial stress",
    body: "Employees carrying a home purchase, a move, or a major expense decision get a clear, honest read instead of quiet anxiety.",
  },
  {
    title: "Fewer rushed decisions",
    body: "A calm second opinion — Financial Reality, Emotional Truth, Perfect Timing — before they sign anything they can't undo.",
  },
  {
    title: "A benefit people actually use",
    body: "No paperwork, no scheduling a call. Employees get their readiness verdict privately, on their own time.",
  },
];

const TIPS = [
  {
    title: "Run the numbers before the excitement",
    body: "Big decisions feel more ready when they feel exciting. Separate the math from the momentum.",
  },
  {
    title: "Notice the pressure, name it",
    body: "A deadline someone else set for you is not the same as your own readiness.",
  },
  {
    title: "\"Not yet\" protects you",
    body: "A not-ready verdict today isn't a no forever. It's information you can act on.",
  },
];

export default function EmployeePage() {
  return (
    <div className="field">
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 md:pt-28">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <Reveal>
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald">
              Employee Benefit
            </p>
            <h1 className="mt-4 font-display text-4xl leading-tight text-light md:text-5xl">
              The benefit that tells your people the truth.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-dim">
              Your employer offers HōMI as a financial-wellness benefit — a
              private, honest readiness check for the decisions that keep
              people up at night. Buying a home. Moving. Making a leap.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/employee/portal" className="btn btn-primary">
                Open my portal
              </Link>
              <Link href="/b2b" className="btn btn-ghost">
                I&rsquo;m an employer
              </Link>
            </div>
          </Reveal>
          <Reveal delay={120} className="flex justify-center">
            <ThresholdCompass size={280} />
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Reveal>
          <h2 className="font-display text-2xl text-light md:text-3xl">What changes for your team</h2>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {OUTCOMES.map((o, i) => (
            <Reveal key={o.title} delay={i * 90}>
              <div className="glass glass-hover h-full p-6">
                <h3 className="text-lg font-semibold text-light">{o.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-dim">{o.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Reveal>
          <div className="glass grid gap-8 p-10 md:grid-cols-[1.1fr_1fr] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-cyan">
                Our privacy promise
              </p>
              <h2 className="mt-3 font-display text-2xl text-light md:text-3xl">
                Your employer never sees your individual results. Ever.
              </h2>
              <p className="mt-4 leading-relaxed text-dim">
                Employers can see that the benefit is being used and get an
                aggregate view of workforce readiness — never your score,
                never your verdict, never your answers. What you enter stays
                yours.
              </p>
            </div>
            <ul className="space-y-3 text-sm text-dim">
              <li className="flex gap-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 10.5l4 4 8-9" />
                </svg>
                Individual scores are never shared with your employer.
              </li>
              <li className="flex gap-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 10.5l4 4 8-9" />
                </svg>
                Only aggregate, anonymized readiness trends are visible to employers.
              </li>
              <li className="flex gap-3">
                <svg className="mt-0.5 h-5 w-5 shrink-0 text-emerald" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 10.5l4 4 8-9" />
                </svg>
                You control what you enter, and you can stop anytime.
              </li>
            </ul>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Reveal>
          <h2 className="font-display text-2xl text-light md:text-3xl">Wellness tips</h2>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {TIPS.map((t, i) => (
            <Reveal key={t.title} delay={i * 90}>
              <div className="glass glass-hover h-full p-6">
                <h3 className="text-lg font-semibold text-light">{t.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-dim">{t.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-28">
        <Reveal>
          <div className="glass flex flex-col items-start gap-6 p-10 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="font-display text-2xl text-light md:text-3xl">
                Your readiness, on your terms.
              </h2>
              <p className="mt-2 max-w-lg text-dim">
                Private by default. No individual results ever reach your employer.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href="/employee/portal" className="btn btn-primary">
                Open my portal
              </Link>
              <Link href="/b2b" className="btn btn-ghost">
                I&rsquo;m an employer
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
