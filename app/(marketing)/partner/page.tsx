import Link from "next/link";
import type { Metadata } from "next";
import { Reveal } from "@/components/ui/Reveal";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";

export const metadata: Metadata = {
  title: "Partner Program",
  description:
    "White-label readiness assessments for financial advisors, coaches, and HR consultants. Help your clients arrive prepared, not pressured.",
  alternates: { canonical: "/partner" },
};

const STEPS = [
  {
    n: "01",
    title: "You invite",
    body: "Share your personal invite link with clients — in an email, a session recap, or your intake packet. No integration required to start.",
  },
  {
    n: "02",
    title: "They get clarity",
    body: "Your client takes the HōMI readiness assessment on their own time. Financial Reality, Emotional Truth, Perfect Timing — one honest verdict, privately.",
  },
  {
    n: "03",
    title: "You get context",
    body: "Aggregate readiness patterns show up in your partner portal. You walk into the next conversation already knowing where they stand.",
  },
];

const PRINCIPLES = [
  {
    title: "No transaction pressure",
    body: "HōMI does not recommend a product, a lender, or a purchase, and does not take commissions or referral fees. There is nothing to upsell, so nothing to distort the verdict.",
  },
  {
    title: "We don't pay for conversions",
    body: "There is no referral commission tied to what a client decides. We don't pay for conversions. That's the point — your recommendation stays yours.",
  },
  {
    title: "White-label ready",
    body: "Your clients experience the assessment under your relationship. HōMI is the instrument, not the brand they need to trust — you already earned that.",
  },
];

const WHO = [
  {
    title: "Financial advisors",
    body: "Use a shared, neutral readiness read before the planning conversation instead of relying on a gut check.",
  },
  {
    title: "Coaches & counselors",
    body: "Give clients language for what they already feel — without turning every session into a spreadsheet.",
  },
  {
    title: "HR & benefits consultants",
    body: "Bring a privacy-first readiness tool to the employers you advise, without becoming the one holding individual data.",
  },
];

export default function PartnerPage() {
  return (
    <div className="field">
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 md:pt-28">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <Reveal>
            <p className="type-kicker text-cyan">For Partners</p>
            <h1 className="mt-4 type-h1">Help your clients arrive prepared, not pressured.</h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-dim">
              HōMI doesn&rsquo;t sell mortgages, funds, or renovations. It tells your clients the
              truth about their readiness — Financial Reality, Emotional Truth, Perfect Timing — so
              your advice lands on solid ground.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/partner/dashboard" className="btn btn-primary">
                Open partner portal
              </Link>
              <Link href="/waitlist" className="btn btn-ghost">
                Request partner access
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
          <h2 className="type-h2">Referral, without the incentive to bend the verdict</h2>
          <p className="mt-3 max-w-2xl text-dim">
            Most partner programs pay for the outcome they want. Ours doesn&rsquo;t have one.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={i * 90}>
              <div className="glass glass-hover h-full p-6">
                <h3 className="type-h4">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-dim">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Reveal>
          <h2 className="type-h2">How it works</h2>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 90}>
              <div className="glass h-full p-6">
                <span className="score-numeral text-3xl font-bold text-cyan">{s.n}</span>
                <h3 className="mt-3 type-h4">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-dim">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <Reveal>
          <h2 className="type-h2">Built for your practice</h2>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {WHO.map((w, i) => (
            <Reveal key={w.title} delay={i * 90}>
              <div className="glass glass-hover h-full p-6">
                <h3 className="type-h4">{w.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-dim">{w.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-28">
        <Reveal>
          <div className="glass flex flex-col items-start gap-6 p-10 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="type-h2">Bring HōMI into your next conversation.</h2>
              <p className="mt-2 max-w-lg text-dim">
                Partner access is free to set up. No commission structure to negotiate, no
                per-conversion fee.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href="/partner/dashboard" className="btn btn-primary">
                Open partner portal
              </Link>
              <Link href="/waitlist" className="btn btn-ghost">
                Request partner access
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
