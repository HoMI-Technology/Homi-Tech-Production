import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Reveal } from "@/components/ui/Reveal";
import { GUIDES, getAllGuideSlugs, getGuide } from "@/components/marketing/guides-data";
import { pageMetadata } from "@/lib/seo/metadata";

export function generateStaticParams() {
  return getAllGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);

  if (!guide) {
    return { title: "Guide not found" };
  }

  return pageMetadata({
    title: guide.title,
    description: guide.description,
    path: `/guides/${guide.slug}`,
  });
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);

  if (!guide) {
    notFound();
  }

  const otherGuides = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 3);

  return (
    <>
      <section className="px-6 pb-12 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl">
          <Link href="/guides" className="text-sm text-dim transition-colors hover:text-cyan">
            &larr; All guides
          </Link>
          <h1 className="mt-5 type-h1">{guide.title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-dim">{guide.description}</p>
        </div>
      </section>

      <Reveal>
        <section className="px-6 py-16">
          <div className="mx-auto max-w-3xl space-y-12">
            {guide.sections.map((section) => (
              <div key={section.heading}>
                <h2 className="type-h2">{section.heading}</h2>
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
                <h2 className="type-h3">See where you stand.</h2>
                <p className="mt-2 text-sm text-dim">
                  Ninety seconds of educational guidance — not a lender decision. Afford is not the
                  same as ready.
                </p>
              </div>
              <Link
                href={`/assessment?utm_source=guides&utm_medium=organic&utm_campaign=${guide.slug}`}
                className="btn btn-primary shrink-0"
              >
                Start Decision Readiness
              </Link>
            </div>
          </div>
        </section>
      </Reveal>

      {otherGuides.length > 0 && (
        <Reveal>
          <section className="px-6 py-16">
            <div className="mx-auto max-w-6xl">
              <h2 className="type-h2">More guides</h2>
              <div className="mt-8 grid gap-6 md:grid-cols-3">
                {otherGuides.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/guides/${g.slug}`}
                    className="group glass glass-hover flex flex-col p-6"
                  >
                    <h3 className="type-h4">{g.title}</h3>
                    <p className="mt-2 flex-1 text-sm text-dim">{g.description}</p>
                    <span className="mt-4 text-sm font-semibold text-cyan">
                      Read{" "}
                      <span
                        aria-hidden
                        className="inline-block transition-transform duration-200 ease-out group-hover:translate-x-1"
                      >
                        &rarr;
                      </span>
                    </span>
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
