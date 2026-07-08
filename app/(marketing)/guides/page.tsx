import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { GUIDES } from "@/components/marketing/guides-data";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "In-depth, honest guides on affordability, runway, credit, timing, and emotional readiness — written to be genuinely useful, not to sell you anything.",
};

export default function GuidesHubPage() {
  return (
    <>
      <section className="px-6 pb-16 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-black text-light md:text-5xl">Guides</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-dim">
            Know your financial truth before every major decision. These are written to be
            genuinely useful — not to sell you anything.
          </p>
        </div>
      </section>

      <Reveal>
        <section className="px-6 py-10">
          <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2">
            {GUIDES.map((guide, i) => (
              <Reveal key={guide.slug} delay={(i % 2) * 100}>
                <Link
                  href={`/guides/${guide.slug}`}
                  className="glass glass-hover flex h-full flex-col p-8"
                >
                  <h2 className="text-xl font-bold text-light">{guide.title}</h2>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-dim">
                    {guide.description}
                  </p>
                  <span className="mt-6 text-sm font-semibold text-cyan">Read the guide &rarr;</span>
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
