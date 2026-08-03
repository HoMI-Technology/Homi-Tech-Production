import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/ui/Reveal";
import {
  LEARNING_ARTICLES,
  getAllArticleSlugs,
  getArticle,
} from "@/components/learning/learning-data";

export function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) {
    return { title: "Article not found" };
  }

  return {
    title: article.title,
    description: article.description,
  };
}

export default async function LearningArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticle(slug);

  if (!article) {
    notFound();
  }

  const otherArticles = LEARNING_ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <>
      <section className="px-6 pb-12 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl">
          <Link href="/guides" className="text-sm text-dim transition-colors hover:text-cyan">
            &larr; All guides &amp; learning
          </Link>
          <h1 className="mt-5 text-4xl font-black leading-tight text-light md:text-5xl">
            {article.title}
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-dim">{article.description}</p>
        </div>
      </section>

      <Reveal>
        <section className="px-6 py-8">
          <div className="mx-auto max-w-3xl space-y-12">
            {article.sections.map((section) => (
              <div key={section.heading}>
                <h2 className="font-display text-2xl font-bold text-light">
                  {section.heading}
                </h2>
                <div className="mt-4 space-y-4">
                  {section.paragraphs.map((p, idx) => (
                    <p key={idx} className="text-lg leading-relaxed text-dim">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <div className="hairline" />
            <div className="mt-10 flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
              <div>
                <h2 className="text-xl font-bold text-light">See where you stand.</h2>
                <p className="mt-2 text-sm text-dim">
                  Ninety seconds tells you the truth about your readiness today.
                </p>
              </div>
              <Link href="/shadow-score" className="btn btn-primary shrink-0">
                Get your score
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      {otherArticles.length > 0 && (
        <Reveal>
          <section className="px-6 py-16">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-2xl font-bold text-light">More articles</h2>
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {otherArticles.map((a) => (
                  <Link
                    key={a.slug}
                    href={`/learning/${a.slug}`}
                    className="glass glass-hover flex flex-col p-6"
                  >
                    <h3 className="font-semibold text-light">{a.title}</h3>
                    <p className="mt-2 flex-1 text-sm text-dim">{a.description}</p>
                    <span className="mt-4 text-sm font-semibold text-cyan">Read &rarr;</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </Reveal>
      )}
    </>
  );
}
