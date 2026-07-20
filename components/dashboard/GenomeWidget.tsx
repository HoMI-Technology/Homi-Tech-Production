import Link from "next/link";
import { GENOME_DIMENSIONS, genomeScoresMap } from "@/lib/genome/constants";
import { SectionHeader } from "@/components/ui/SectionHeader";

/**
 * Compact 9-bar genome strip (server-safe).
 * Accepts raw behavioral_genome.scores jsonb or a flat map.
 */
export function GenomeWidget({ scores }: { scores: unknown }) {
  const map = genomeScoresMap(scores);
  const hasData = Object.keys(map).length > 0;

  if (!hasData) return null;

  return (
    <div className="glass p-8">
      <SectionHeader
        eyebrow="Profile"
        title="Your Behavioral Genome"
        subtitle="Nine dimensions that shape how you decide."
        action={
          <Link href="/genome" className="btn btn-ghost !px-4 !py-2 text-sm">
            Explore full genome →
          </Link>
        }
      />
      <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-9">
        {GENOME_DIMENSIONS.map((dim) => {
          const value = map[dim.key] ?? 0;
          const pct = Math.max(0, Math.min(1, value / 100));
          return (
            <div key={dim.key} className="flex flex-col items-center text-center">
              <div className="relative h-20 w-3 overflow-hidden rounded-full bg-slate-surface">
                <div
                  className="absolute bottom-0 w-full rounded-full transition-all duration-700"
                  style={{
                    height: `${pct * 100}%`,
                    background: `linear-gradient(180deg, ${dim.color}88, ${dim.color})`,
                  }}
                />
              </div>
              <span className="score-numeral mt-2 text-sm text-light">{value}</span>
              <span className="mt-0.5 text-[0.625rem] leading-tight text-dim">{dim.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
