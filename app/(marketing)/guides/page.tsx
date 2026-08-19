import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { GUIDES } from "@/components/marketing/guides-data";
import { LEARNING_ARTICLES } from "@/components/learning/learning-data";
import { BLOG_POSTS } from "@/components/marketing/blog-data";

import { pageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Guides",
  description:
    "In-depth, honest guides on affordability, runway, credit, timing, and emotional readiness — plus the reasoning behind the method and notes on why HōMI exists.",
  path: "/guides",
});

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function GuidesHubPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <section className="px-6 pb-16 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="type-h1">Guides</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-dim">
            Know your financial truth before every major decision. These are written to be genuinely
            useful — not to sell you anything.
          </p>
        </div>
      </section>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
            {GUIDES.map((guide, i) => (
              <Reveal key={guide.slug} delay={(i % 2) * 100}>
                <Link
                  href={`/guides/${guide.slug}`}
                  className="group glass glass-hover flex h-full flex-col p-8"
                >
                  <h2 className="type-h3">{guide.title}</h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-dim">
                    {guide.description}
                  </p>
                  <span className="mt-6 text-sm font-semibold text-cyan">
                    Read the guide{" "}
                    <span
                      aria-hidden
                      className="inline-block transition-transform duration-200 ease-out group-hover:translate-x-1"
                    >
                      &rarr;
                    </span>
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="type-h2">Learning</h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-dim">
                Guides are how. Learning is why. The reasoning behind the thresholds — the math, the
                hard-stops, and the method — explained so you can check our work, not just take our
                word for it.
              </p>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {LEARNING_ARTICLES.map((article, i) => (
                <Reveal key={article.slug} delay={(i % 2) * 100}>
                  <Link
                    href={`/learning/${article.slug}`}
                    className="group glass glass-hover flex h-full flex-col p-8"
                  >
                    <h3 className="type-h3">{article.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-dim">
                      {article.description}
                    </p>
                    <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-cyan">
                      Read
                      <svg
                        className="transition-transform duration-200 ease-out group-hover:translate-x-0.5"
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
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="type-h2">From the blog</h2>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-dim">
                Notes on why HōMI exists, how the incentives around home-buying advice actually
                work, and what we're building toward.
              </p>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {posts.map((post, i) => (
                <Reveal key={post.slug} delay={(i % 2) * 100}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group glass glass-hover flex h-full flex-col p-8"
                  >
                    <div className="flex items-center gap-2 text-xs text-dim">
                      <span>{formatDate(post.date)}</span>
                      <span aria-hidden="true">&middot;</span>
                      <span>{post.readMinutes} min read</span>
                    </div>
                    <h3 className="mt-3 type-h3">{post.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-dim">
                      {post.description}
                    </p>
                    <span className="mt-6 text-sm font-semibold text-cyan">
                      Read the post{" "}
                      <span
                        aria-hidden
                        className="inline-block transition-transform duration-200 ease-out group-hover:translate-x-1"
                      >
                        &rarr;
                      </span>
                    </span>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section className="px-6 py-20 text-center">
          <div className="mx-auto max-w-2xl">
            <h2 className="type-h1">Ready to see your own number?</h2>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/shadow-score" className="btn btn-primary">
                Get your score — 90 seconds
              </Link>
              <Link href="/how-it-works" className="btn btn-ghost">
                How it works
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </>
  );
}
