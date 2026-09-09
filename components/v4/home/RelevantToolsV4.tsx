import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, CreditCard, Home, Scale, Shield } from "lucide-react";
import { HomeSectionV4 } from "@/components/v4/home/HomeSectionV4";
import { HOME_DENSITY_LENSES } from "@/lib/dashboard/fold-truth";
import type { HomeV4Tool } from "@/lib/v4/home-state";

const TOOL_ICONS: Record<string, LucideIcon> = {
  "net-worth": Scale,
  "emergency-fund": Shield,
  affordability: Home,
  "debt-payoff": CreditCard,
};

function toolLine(id: string): string | null {
  return HOME_DENSITY_LENSES.find((lens) => lens.id === id)?.line ?? null;
}

export function RelevantToolsV4({ tools }: { tools: HomeV4Tool[] }) {
  return (
    <HomeSectionV4
      kicker="Relevant to this decision"
      data-home-v4-tools=""
      aria-label="Contextual tools"
      className="v4-tools"
    >
      <ul className="v4-tools-grid">
        {tools.map((tool) => {
          const Icon = TOOL_ICONS[tool.id] ?? Scale;
          const line = toolLine(tool.id);
          return (
            <li key={tool.id}>
              <Link href={tool.href} className="v4-tool-cell" data-home-v4-tool={tool.id}>
                <span className="v4-tool-icon" aria-hidden>
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                <span className="v4-tool-copy">
                  <span className="v4-tool-title">{tool.title}</span>
                  {line ? <span className="v4-tool-line">{line}</span> : null}
                </span>
                <span className="v4-tool-open">
                  Open
                  <ArrowUpRight aria-hidden className="v4-tool-arrow size-3.5" strokeWidth={1.75} />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </HomeSectionV4>
  );
}
