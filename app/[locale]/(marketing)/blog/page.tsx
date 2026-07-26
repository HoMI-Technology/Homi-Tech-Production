import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Reveal } from "@/components/ui/Reveal";
import { BLOG_POSTS } from "@/components/marketing/blog-data";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notes on why HōMI exists, the conflict of interest built into most home-buying advice, and what a readiness score actually measures.",
  alternates: { canonical: "/blog" },
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BlogHubPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <section className="px-6 pb-16 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-black text-light md:text-5xl">Blog</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-dim">
            Notes on why HōMI exists, how the incentives around home-buying advice actually work,
            and what we're building toward.
          </p>
        </div>
      </section>

      <Reveal>
        <section className="px-6 py-10">
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
            {posts.map((post, i) => (
              <Reveal key={post.slug} delay={(i % 2) * 100}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="glass glass-hover flex h-full flex-col p-8"
                >
                  <div className="flex items-center gap-2 text-xs text-dim">
                    <span>{formatDate(post.date)}</span>
                    <span aria-hidden="true">&middot;</span>
                    <span>{post.readMinutes} min read</span>
                  </div>
                  <h2 className="mt-3 text-xl font-bold text-light">{post.title}</h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-dim">
                    {post.description}
                  </p>
                  <span className="mt-6 text-sm font-semibold text-cyan">Read the post &rarr;</span>
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
              <Link href="/learning" className="btn btn-ghost">
                Explore Learning
              </Link>
            </div>
          </div>
        </section>
      </Reveal>
    </>
  );
}
