import type { Metadata } from "next";
import Link from "next/link";
import { BRAND, LEGAL_DISCLAIMER } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Disclaimer",
  description:
    "HōMI provides educational guidance only. Read the full disclaimer on what HōMI is, and what it is not.",
  alternates: { canonical: "/legal/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <section className="px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <h1 className="type-h1">Disclaimer</h1>
        <p className="mt-3 text-sm text-dim">Last updated: July 2026</p>

        <div className="glass mt-10 p-8">
          <p className="text-lg leading-relaxed text-light">{LEGAL_DISCLAIMER}</p>
        </div>

        <div className="mt-10 space-y-10 text-dim">
          <div>
            <h2 className="type-h3">Educational guidance only</h2>
            <p className="mt-3 leading-relaxed">
              Everything {BRAND.display} produces &mdash; your HōMI-Score, your verdict, your
              readiness report, your transformation plan, and any conversation with the
              Decision Companion &mdash; is educational guidance. None of it is financial,
              legal, tax, mortgage, real estate, or investment advice, and none of it should
              be treated as a recommendation to buy, sell, borrow, refinance, or invest.
            </p>
          </div>

          <div>
            <h2 className="type-h3">What {BRAND.display} is not</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed">
              <li>Not a lender or mortgage broker.</li>
              <li>Not a registered investment advisor (RIA).</li>
              <li>Not a credit bureau.</li>
              <li>Not a real estate agent or brokerage.</li>
              <li>Not a financial planner.</li>
              <li>Not a bank or deposit institution.</li>
              <li>Not a product recommendation engine.</li>
            </ul>
          </div>

          <div>
            <h2 className="type-h3">The verdict is not a guarantee</h2>
            <p className="mt-3 leading-relaxed">
              A READY verdict does not guarantee loan approval, favorable financing terms,
              or a positive outcome from any decision you make. A NOT YET or BUILD FIRST
              verdict does not mean a decision is impossible &mdash; it means our
              methodology identified factors worth addressing first. In all cases, the
              verdict reflects the inputs you provided and the methodology applied to them;
              it does not account for every fact of your individual circumstances, and it is
              not a substitute for advice from a licensed professional.
            </p>
          </div>

          <div>
            <h2 className="type-h3">You make the decision</h2>
            <p className="mt-3 leading-relaxed">
              {BRAND.display} is built to give you clarity, not to make the decision for
              you. You are solely responsible for any financial, legal, or personal decision
              you make, whether or not it aligns with your HōMI-Score or verdict. We
              encourage you to consult a licensed financial advisor, mortgage professional,
              attorney, or tax professional for advice specific to your situation.
            </p>
          </div>

          <div>
            <h2 className="type-h3">Related pages</h2>
            <p className="mt-3 leading-relaxed">
              See our{" "}
              <Link href="/legal/terms" className="text-cyan hover:underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/legal/privacy" className="text-cyan hover:underline">
                Privacy Policy
              </Link>{" "}
              for the complete legal terms governing your use of {BRAND.display}.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
