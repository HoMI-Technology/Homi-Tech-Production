import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";

export const metadata: Metadata = {
  title: "HōMI for Teams",
  description:
    "A financial-wellness benefit that measures readiness, not just affordability. Bring HōMI to your employees as a Decision Companion, not another budgeting app.",
  alternates: { canonical: "/b2b" },
};

export default function B2BPage() {
  return (
    <>
      <section className="px-6 pb-16 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="type-h1">HōMI for teams</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-dim">
            The financial-wellness benefit that measures readiness, not just account
            balances. Give your people the one honest voice in a sea of things trying to
            sell them something.
          </p>
        </div>
      </section>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <div className="glass p-10 md:p-14">
              <h2 className="type-h2">
                Outcomes, not transactions
              </h2>
              <p className="mt-5 leading-relaxed text-dim">
                Most financial-wellness benefits are measured by engagement: logins, clicks,
                accounts opened. HōMI measures something different — whether your people are
                actually more ready to make their next major decision than they were before.
                Readiness is the outcome. Transactions are not the goal.
              </p>
              <p className="mt-5 leading-relaxed text-dim">
                A team that understands its own readiness makes fewer decisions it regrets.
                Fewer regretted decisions means less financial stress carried into the
                workday — and that shows up in retention, focus, and trust in the benefits
                you offer.
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center type-h2">
              What your people get
            </h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <div className="glass glass-hover p-8">
                <h3 className="type-h4">A private readiness score</h3>
                <p className="mt-3 text-sm leading-relaxed text-dim">
                  Individual results stay individual. Employers see participation and
                  aggregate trends — never a single person&rsquo;s answers.
                </p>
              </div>
              <div className="glass glass-hover p-8">
                <h3 className="type-h4">A Decision Companion</h3>
                <p className="mt-3 text-sm leading-relaxed text-dim">
                  Conversations that help employees see their own situation clearly before a
                  major purchase, a career change, or a move.
                </p>
              </div>
              <div className="glass glass-hover p-8">
                <h3 className="type-h4">No transaction pressure</h3>
                <p className="mt-3 text-sm leading-relaxed text-dim">
                  HōMI does not take commissions or referral fees, and it has no product to
                  push. The benefit works for your employees because nothing HōMI earns
                  depends on what they decide.
                </p>
              </div>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="type-h2">
              Already exploring a rollout?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-dim">
              Whether you&rsquo;re a benefits partner or an employee looking into what your
              company offers, here&rsquo;s where to go next.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-2">
              <Link href="/partner" className="group glass glass-hover flex flex-col p-8 text-left">
                <h3 className="type-h4">For partners</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-dim">
                  Bring HōMI to your benefits platform or your client roster.
                </p>
                <span className="mt-5 text-sm font-semibold text-cyan">Learn more <span aria-hidden className="inline-block transition-transform duration-200 ease-out group-hover:translate-x-1">&rarr;</span></span>
              </Link>
              <Link
                href="/employee"
                className="group glass glass-hover flex flex-col p-8 text-left"
              >
                <h3 className="type-h4">For employees</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-dim">
                  See what the benefit includes if your employer offers HōMI.
                </p>
                <span className="mt-5 text-sm font-semibold text-cyan">Learn more <span aria-hidden className="inline-block transition-transform duration-200 ease-out group-hover:translate-x-1">&rarr;</span></span>
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="type-h1">
              Bring readiness to your team.
            </h2>
            <p className="mt-4 text-dim">
              Tell us a bit about your organization and we&rsquo;ll follow up with next steps.
            </p>
            <div className="mt-8">
              <Link href="/waitlist" className="btn btn-primary">
                Tell us about your team
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </>
  );
}
