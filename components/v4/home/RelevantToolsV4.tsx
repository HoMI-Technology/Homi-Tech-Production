import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, Home, Scale, Shield, CreditCard } from "lucide-react";
import { HomeSectionV4 } from "@/components/v4/home/HomeSectionV4";
import type { HomeV4Tool } from "@/lib/v4/home-state";

const TOOL_ICONS: Record<string, LucideIcon> = {
  "net-worth": Scale,
  "emergency-fund": Shield,
  affordability: Home,
  "debt-payoff": CreditCard,
};

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
          return (
            <li key={tool.id}>
              <Link href={tool.href} className="v4-tool-cell" data-home-v4-tool={tool.id}>
                <span className="v4-tool-icon" aria-hidden>
                  <Icon className="size-4" strokeWidth={1.75} />
                </span>
                <span className="v4-tool-title">{tool.title}</span>
                <ArrowUpRight aria-hidden className="v4-tool-arrow size-3.5" strokeWidth={1.75} />
              </Link>
            </li>
          );
        })}
      </ul>
    </HomeSectionV4>
  );
}
