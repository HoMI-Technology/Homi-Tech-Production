import { COLORS } from "@/lib/brand";
import { HomeSectionV4 } from "@/components/v4/home/HomeSectionV4";
import type { HomeV4Pillar } from "@/lib/v4/home-state";

const PILLAR_ACCENT: Record<HomeV4Pillar["id"], string> = {
  financial: COLORS.cyan,
  emotional: COLORS.emerald,
  timing: COLORS.yellow,
};

export function DecisionEvidenceV4({ pillars }: { pillars: HomeV4Pillar[] }) {
  if (pillars.length !== 3) return null;

  return (
    <HomeSectionV4
      kicker="What HōMI is seeing"
      data-home-v4-evidence=""
      aria-label="Decision evidence"
      className="v4-evidence"
    >
      <ul className="v4-evidence-band">
        {pillars.map((pillar) => (
          <li
            key={pillar.id}
            className="v4-evidence-zone"
            data-home-v4-pillar={pillar.id}
            data-home-v4-pillar-status={pillar.status}
            style={{ ["--v4-pillar-accent" as string]: PILLAR_ACCENT[pillar.id] }}
          >
            <p className="v4-evidence-name">{pillar.title}</p>
            <p className="v4-evidence-status">{pillar.status}</p>
          </li>
        ))}
      </ul>
    </HomeSectionV4>
  );
}
