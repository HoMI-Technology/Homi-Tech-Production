import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { definedTermJsonLd, faqPageJsonLd, type FaqItem } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/metadata";
import { SITE_URL } from "@/lib/seo/site";
import { LEGAL_DISCLAIMER } from "@/lib/brand";
import { PRIMARY_CLOSE_HREF, PRIMARY_CLOSE_LABEL } from "@/components/marketing/first-moment-copy";

/**
 * Category pillar — the canonical definition of Decision Readiness
 * Intelligence™. Every mention of the term (hero eyebrow, /method, /about,
 * external citation) should resolve here.
 *
 * Copy law: qualitative names only — no pillar max scores, no verdict numeric
 * bands (brand-check N21/N22), no invented statistics, never-say clean.
 * DEFINITION below is emitted verbatim as the DefinedTerm description, so it
 * must stay identical to the rendered dek.
 */
const TERM = "Decision Readiness Intelligence";

const DEFINITION =
  "Decision Readiness Intelligence is the measurement of whether a person is ready for a major " +
  "commitment — financially, emotionally, and in timing — made in the moment before the " +
  "application, the loan, or the leap. It answers one question: will you be okay?";

const FAQS: FaqItem[] = [
  {
    q: "Is Decision Readiness Intelligence a credit score?",
    a: "No. A credit score estimates whether a lender will be repaid. Decision Readiness Intelligence measures whether you are ready for the decision itself. HōMI answers a different question: readiness — it sits before the application, not inside the approval engine, and readiness results are never furnished for lending, employment, or housing eligibility decisions.",
  },
  {
    q: "Where does the term come from?",
    a: "Decision Readiness Intelligence™ was coined by HōMI, a product of Homi Technologies LLC, to name a layer that did not exist: measurement of readiness before a commitment, built with no referral fees and no transaction pressure.",
  },
  {
    q: "How is readiness measured?",
    a: "Across three pillars — Financial Reality, Emotional Truth, and Perfect Timing — through a guided assessment. Deterministic code computes the Decision Readiness Score and verdict; AI explains the result in plain language but never calculates or overrides it.",
  },
  {
    q: "What can the verdict say?",
    a: "Ready, Almost There, Build First, or Not Yet. Every verdict short of Ready comes with the specific gaps and what to build first. Not yet is not no — it is clarity, and it is protection.",
  },
  {
    q: "Is this financial advice?",
    a: "No. HōMI is a Decision Companion: educational guidance only. It helps you see your own situation clearly — it doesn't recommend products, and it isn't a substitute for a licensed advisor.",
  },
];

export const metadata: Metadata = pageMetadata({
  title: "What Is Decision Readiness Intelligence?",
  description:
    "Decision Readiness Intelligence, defined: measuring whether you're ready — financially, emotionally, and in timing — before a major commitment. A different question than a credit score, answered before the application.",
  path: "/decision-readiness-intelligence",
});

export default function DecisionReadinessIntelligencePage() {
  return (
    <>
      <JsonLd
        data={definedTermJsonLd(
          { name: TERM, description: DEFINITION, path: "/decision-readiness-intelligence" },
          SITE_URL,
        )}
      />
      <JsonLd data={faqPageJsonLd(FAQS)} />

      <section className="px-6 pb-16 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="type-h1">Decision Readiness Intelligence</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-dim">{DEFINITION}</p>
        </div>
      </section>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl space-y-6 text-lg leading-relaxed text-dim">
            <h2 className="type-h2">The question nothing else was built to answer</h2>
            <p>
              Every instrument in personal finance activates after you&rsquo;ve decided. A credit
              score tells lenders whether to trust you. A pre-qualification tells you what you can
              borrow. A budgeting app tells you what happened to the money afterward. Nothing sits
              in the hour before the commitment and asks the only question that decides how the
              next decade feels: <em className="text-light">will you be okay?</em>
            </p>
            <p>
              Decision Readiness Intelligence is the name for that missing layer. It is not a
              better version of an existing tool. It is the readiness layer credit scores were
              never designed to be — a different question, answered at a different moment, for a
              different person: you, not the lender.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl space-y-6 text-lg leading-relaxed text-dim">
            <h2 className="type-h2">Three pillars, one reading</h2>
            <p>
              Readiness isn&rsquo;t one number pretending to be objective. It is three honest
              measurements taken together: <strong className="text-light">Financial Reality</strong>{" "}
              — what you can actually carry, not just what a lender will approve.{" "}
              <strong className="text-light">Emotional Truth</strong> — whether the desire is
              genuinely yours, whether the people in the decision are aligned, whether you&rsquo;re
              being rushed by a deadline that isn&rsquo;t yours.{" "}
              <strong className="text-light">Perfect Timing</strong> — whether this is the right
              moment in your life, not just in the market.
            </p>
            <p>
              The reading is deterministic: code computes the Decision Readiness Score and its
              verdict, the same way every time. AI explains what the result means in plain
              language — it never calculates, adjusts, or overrides it.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl space-y-6 text-lg leading-relaxed text-dim">
            <h2 className="type-h2">Waiting is a valid outcome</h2>
            <p>
              This is the part no transaction-funded product can say: sometimes the readiness
              answer is <strong className="text-light">Not Yet</strong> — and that answer is worth
              as much as a green light. A verdict short of Ready names the specific gaps and what
              to build first. Build First is not failure. It is the map.
            </p>
            <p>
              Decision Readiness Intelligence only works if the measurement has no stake in your
              answer. That is why HōMI takes no referral fees from lenders, brokers, or insurers —
              ever. Clarity, not commission.
            </p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl space-y-6 text-lg leading-relaxed text-dim">
            <h2 className="type-h2">What Decision Readiness Intelligence is not</h2>
            <p>
              It is not a credit score, and it does not replace one — lenders will still pull a
              credit report; that is their gate, answering their question. It is not an approval,
              a pre-qualification, or a promise of outcomes. It is not financial advice, and it is
              not therapy. Readiness results sit before the application, not inside the approval
              engine, and are never furnished to decide whether you get credit, housing, or a job.
            </p>
            <p className="text-sm leading-relaxed">{LEGAL_DISCLAIMER}</p>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <h2 className="type-h2">Common questions</h2>
            <div className="mt-8 space-y-6">
              {FAQS.map((faq) => (
                <div key={faq.q} className="glass p-6">
                  <h3 className="font-display text-lg text-light">{faq.q}</h3>
                  <p className="mt-3 leading-relaxed text-dim">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="type-h1">See where you stand.</h2>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href={PRIMARY_CLOSE_HREF} className="btn btn-primary">
                {PRIMARY_CLOSE_LABEL}
              </Link>
              <Link href="/method" className="btn btn-ghost">
                The method
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </>
  );
}
