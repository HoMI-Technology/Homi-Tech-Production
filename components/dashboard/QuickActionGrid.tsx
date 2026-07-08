import Link from "next/link";

const ICONS: Record<string, React.ReactNode> = {
  assessment: (
    <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  ),
  shadow: <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />,
  plan: <path d="M4 6h16M4 12h16M4 18h7" />,
  advisor: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
  journal: <path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />,
  tools: <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.4-3.4a4 4 0 01-5.6 5.6L6 21l-3-3 9.5-9.5a4 4 0 015.6-5.6z" />,
  couples: <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.5l-1-.9a5.5 5.5 0 10-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 000-7.8z" />,
  genome: <path d="M12 2a5 5 0 015 5c0 2-1 3-2 4s-1 2 0 3 2 2 2 4a5 5 0 01-10 0c0-2 1-3 2-4s1-2 0-3-2-2-2-4a5 5 0 015-5z" />,
};

const ACTIONS = [
  { href: "/assessment", label: "Assessment", desc: "Full 3-pillar readiness check", icon: "assessment" },
  { href: "/shadow-score", label: "Shadow Score", desc: "A quick, lighter read", icon: "shadow" },
  { href: "/plan", label: "Plan", desc: "Your personalized next steps", icon: "plan" },
  { href: "/advisor", label: "Companion", desc: "Talk it through", icon: "advisor" },
  { href: "/journal", label: "Journal", desc: "Log the decisions you're making", icon: "journal" },
  { href: "/tools", label: "Tools", desc: "Calculators for the math", icon: "tools" },
  { href: "/couples", label: "Couples", desc: "Check alignment with a partner", icon: "couples" },
  { href: "/genome", label: "Genome", desc: "Your decision psychology", icon: "genome" },
];

export function QuickActionGrid({ journalCount }: { journalCount: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {ACTIONS.map((action) => (
        <Link key={action.href} href={action.href} className="glass glass-hover flex flex-col gap-3 p-5">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            {ICONS[action.icon]}
          </svg>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-light">{action.label}</span>
              {action.href === "/journal" && journalCount > 0 && (
                <span className="score-numeral rounded-full bg-slate-surface px-2 py-0.5 text-xs text-dim">
                  {journalCount}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-dim">{action.desc}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
