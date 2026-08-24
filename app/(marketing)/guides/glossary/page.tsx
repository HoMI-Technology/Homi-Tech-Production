import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { JsonLd } from "@/components/seo/JsonLd";
import { definedTermSetJsonLd } from "@/lib/seo/schema";
import { pageMetadata } from "@/lib/seo/metadata";
import { SITE_URL } from "@/lib/seo/site";

/**
 * The Decision Readiness Glossary — the category's vocabulary, defined on
 * our domain. Each entry renders on the page AND ships verbatim as a
 * DefinedTerm inside one DefinedTermSet (same TERMS array, no drift).
 *
 * Copy law: qualitative only — no pillar weights, no verdict numeric bands,
 * no scoring internals, never-say clean.
 */
interface GlossaryEntry {
  term: string;
  definition: string;
  href?: string;
  hrefLabel?: string;
}

const TERMS: GlossaryEntry[] = [
  {
    term: "Decision Readiness Intelligence",
    definition:
      "The measurement of whether a person is ready for a major commitment — financially, emotionally, and in timing — made in the moment before the application, the loan, or the leap. The category HōMI created and the layer credit scores were never designed to be.",
    href: "/decision-readiness-intelligence",
    hrefLabel: "Full definition",
  },
  {
    term: "Decision Readiness Score",
    definition:
      "The deterministic reading HōMI's assessment produces for one specific decision: a score and a verdict computed the same way every time from your answers across the three pillars. Educational guidance — not an approval, not advice, and never furnished for eligibility decisions.",
  },
  {
    term: "Decision Companion",
    definition:
      "What HōMI is: a companion for the moment before a commitment, with no stake in your answer. Not a lender, broker, credit bureau, or advisor — an honest voice whose revenue never depends on what you decide.",
  },
  {
    term: "Financial Reality",
    definition:
      "The pillar that asks what you can actually carry — income, obligations, savings, and shock absorption — as distinct from what a lender will approve. The bank's ceiling is its risk limit, not your goal line.",
  },
  {
    term: "Emotional Truth",
    definition:
      "The pillar that treats the human side of a decision as signal, not noise: whether the desire is genuinely yours, whether the people deciding with you are aligned, and whether the deadline you feel is real or borrowed. Weighed with the same seriousness as the math.",
  },
  {
    term: "Perfect Timing",
    definition:
      "The pillar that asks whether this is the right window in your life — income settling, horizon legible, people ready — rather than the right moment in the market. Timing the market is a losing game; timing your life is answerable.",
  },
  {
    term: "Verdict",
    definition:
      "The plain-language answer on top of the score: Ready, Almost There, Build First, or Not Yet. Every verdict short of Ready names the specific gaps and what to build first — a map, never a grade.",
  },
  {
    term: "Build First",
    definition:
      "The verdict that says the decision isn't safe yet and shows exactly why. Build First is not failure — it is the map: one binding constraint, one season of specific building, then a re-check.",
    href: "/guides/build-first-playbook",
    hrefLabel: "The playbook",
  },
  {
    term: "Not yet",
    definition:
      "The protective answer no transaction-funded product can afford to give. Not yet is not no — it is clarity about a gap while it still costs a season to close instead of a decade.",
  },
  {
    term: "Hard stop",
    definition:
      "A condition serious enough to pause any readiness reading on its own, no matter how strong the rest of the picture looks. Hard stops exist to protect you from the handful of situations where proceeding is dangerous rather than merely suboptimal.",
    href: "/guides/hard-stops",
    hrefLabel: "The four hard stops",
  },
  {
    term: "Emergency runway",
    definition:
      "The number of months your liquid savings could cover essential expenses if income stopped — kept separate from any down payment. Runway is the shock absorber every other financial move depends on, and the thing buyers most often empty on the way to closing.",
  },
  {
    term: "Debt-to-income ratio (DTI)",
    definition:
      "Your monthly debt obligations as a share of gross monthly income — the classic measure of how much of your earning power is already spoken for. One strand of Financial Reality: a matter of degree, until it isn't.",
  },
  {
    term: "Path to Ready",
    definition:
      "The build plan a verdict unlocks: the binding constraint, the next move, and progress you can watch. The path exists so a protective verdict ends in momentum instead of shame.",
  },
  {
    term: "First Moment",
    definition:
      "The quiet, account-free introduction to HōMI: a few beats to see how readiness thinking works before any assessment begins. The front door that never pressures the walk-through.",
    href: "/first-moment",
    hrefLabel: "Start there",
  },
  {
    term: "Threshold Compass",
    definition:
      "HōMI's instrument — the keyhole-and-rings mark that reads as a compass becoming a key. It stands for the threshold moment: the point before a commitment where clarity, not momentum, should decide whether you turn it.",
  },
  {
    term: "Shadow Score",
    definition:
      "A quick, anonymous glimpse of readiness mechanics without an account and without becoming your Decision Readiness Score. A teaser of the method — deliberately never stored as the real reading.",
    href: "/shadow-score",
    hrefLabel: "Try it",
  },
];

/** Stable per-term anchor id: lowercase, non-alphanumeric runs collapse to one hyphen. */
function slugify(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const metadata: Metadata = pageMetadata({
  title: "The Decision Readiness Glossary",
  description:
    "The vocabulary of Decision Readiness Intelligence, defined: the three pillars, the four verdicts, hard stops, emergency runway, Build First, and the rest of the language HōMI uses to answer “will you be okay?”",
  path: "/guides/glossary",
});

export default function GlossaryPage() {
  return (
    <>
      <JsonLd
        data={definedTermSetJsonLd(
          {
            name: "Decision Readiness Glossary",
            path: "/guides/glossary",
            terms: TERMS.map(({ term, definition }) => ({ term, definition })),
          },
          SITE_URL,
        )}
      />

      <section className="px-6 pb-16 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="type-h1">The Decision Readiness Glossary</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-dim">
            The language of readiness, defined in one place. Every term links back to the same
            question: before the commitment, will you be okay?
          </p>
        </div>
      </section>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl space-y-6">
            {TERMS.map((entry) => (
              <div key={entry.term} id={slugify(entry.term)} className="glass p-6">
                <h2 className="font-display text-xl text-light">{entry.term}</h2>
                <p className="mt-3 leading-relaxed text-dim">{entry.definition}</p>
                {entry.href ? (
                  <p className="mt-3 text-sm">
                    <Link
                      href={entry.href}
                      className="text-cyan underline decoration-cyan/40 underline-offset-4 hover:decoration-cyan"
                    >
                      {entry.hrefLabel}
                    </Link>
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="type-h1">See the vocabulary in motion.</h2>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/guides" className="btn btn-primary">
                All guides
              </Link>
              <Link href="/decision-readiness-intelligence" className="btn btn-ghost">
                The category, defined
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </>
  );
}
