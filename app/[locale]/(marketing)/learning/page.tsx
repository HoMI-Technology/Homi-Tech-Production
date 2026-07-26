import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/Reveal";
import { LEARNING_ARTICLES } from "@/components/learning/learning-data";

export const metadata: Metadata = {
  title: "Learning",
  description:
    "Guides are how. Learning is why. The reasoning, math, and thresholds behind the HōMI-Score, written to be genuinely understood — not just followed.",
};

export default function LearningHubPage() {
  return (
    <>
      <section className="px-6 pb-16 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-black text-light md:text-5xl">Learning</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-dim">
            Guides are how. Learning is why. This is the reasoning behind the thresholds — the
            math, the hard-stops, and the method — explained so you can check our work, not just
            take our word for it.
          </p>
        </div>
      </section>

      <Reveal>
        <section className="px-6 py-10">
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
            {LEARNING_ARTICLES.map((article, i) => (
              <Reveal key={article.slug} delay={(i % 2) * 100}>
                <Link
                  href={`/learning/${article.slug}`}
                  className="glass glass-hover flex h-full flex-col p-8"
                >
                  <h2 className="text-xl font-bold text-light">{article.title}</h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-dim">
                    {article.description}
                  </p>
                  <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-cyan">
                    Read
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M7 4l6 6-6 6" />
                    </svg>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="text-3xl font-black text-light md:text-4xl">
              Ready to see your own number?
            </h2>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/shadow-score" className="btn btn-primary">
                Get your score — 90 seconds
              </Link>
              <Link href="/guides" className="btn btn-ghost">
                Browse the guides
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </>
  );
}
