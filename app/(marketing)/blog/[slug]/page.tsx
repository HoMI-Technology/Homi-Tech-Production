import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/ui/Reveal";
import { BLOG_POSTS, getAllPostSlugs, getPost } from "@/components/marketing/blog-data";
import { JsonLd } from "@/components/seo/JsonLd";
import { articleJsonLd } from "@/lib/seo/schema";
import { SITE_URL } from "@/lib/seo/site";

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    return { title: "Post not found" };
  }

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);

  if (!post) {
    notFound();
  }

  const otherPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      <JsonLd
        data={articleJsonLd(
          {
            title: post.title,
            description: post.description,
            datePublished: post.date,
            path: `/blog/${post.slug}`,
          },
          SITE_URL,
        )}
      />
      <section className="px-6 pb-12 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl">
          <Link href="/blog" className="text-sm text-dim transition-colors hover:text-cyan">
            &larr; All posts
          </Link>
          <h1 className="mt-5 text-4xl font-black leading-tight text-light md:text-5xl">
            {post.title}
          </h1>
          <div className="mt-4 flex items-center gap-2 text-sm text-dim">
            <span>{formatDate(post.date)}</span>
            <span aria-hidden="true">&middot;</span>
            <span>{post.readMinutes} min read</span>
          </div>
          <p className="mt-5 text-lg leading-relaxed text-dim">{post.description}</p>
        </div>
      </section>

      <Reveal>
        <section className="px-6 py-8">
          <div className="mx-auto max-w-3xl space-y-12">
            {post.sections.map((section, idx) => (
              <div key={section.heading ?? idx}>
                {section.heading && (
                  <h2 className="font-display text-2xl font-bold text-light">
                    {section.heading}
                  </h2>
                )}
                <div className={`space-y-4 ${section.heading ? "mt-4" : ""}`}>
                  {section.paragraphs.map((p, pIdx) => (
                    <p key={pIdx} className="text-lg leading-relaxed text-dim">
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

      {otherPosts.length > 0 && (
        <Reveal>
          <section className="px-6 py-16">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-2xl font-bold text-light">More from the blog</h2>
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {otherPosts.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="glass glass-hover flex flex-col p-6"
                  >
                    <span className="text-xs text-dim">{formatDate(p.date)}</span>
                    <h3 className="mt-2 font-semibold text-light">{p.title}</h3>
                    <p className="mt-2 flex-1 text-sm text-dim">{p.description}</p>
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
