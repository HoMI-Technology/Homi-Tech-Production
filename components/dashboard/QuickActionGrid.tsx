import Link from "next/link";

import { COLORS } from "@/lib/brand";
import { NAV_CATALOG } from "@/lib/layout/nav-catalog";

const ICONS: Record<string, React.ReactNode> = {
  assessment: <path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />,
  shadow: (
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  ),
  plan: <path d="M4 6h16M4 12h16M4 18h7" />,
  advisor: <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />,
  journal: (
    <path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
  ),
  money: (
    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
  ),
  couples: (
    <path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.5l-1-.9a5.5 5.5 0 10-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 000-7.8z" />
  ),
  path: <path d="M4 19l4-4 4 2 8-10" />,
};

interface Action {
  href: string;
  label: string;
  desc: string;
  icon: string;
  nowDesc?: string;
}

/** Copy + icons keyed by catalog href — never invent launch-hidden routes here. */
const ACTION_COPY: Record<string, { desc: string; icon: string; nowDesc?: string }> = {
  "/assessment": {
    desc: "Full 3-pillar readiness check",
    icon: "assessment",
    nowDesc: "Get your full verdict — ~10 minutes",
  },
  "/shadow-score": {
    desc: "A quick, lighter read",
    icon: "shadow",
    nowDesc: "A first score in about 2 minutes",
  },
  "/money": {
    desc: "Picture · track · decide — one finance surface",
    icon: "money",
    nowDesc: "Your financial pillar is the one to work — open Money",
  },
  "/plan": {
    desc: "Personalized next steps from your verdict",
    icon: "plan",
  },
  "/path": {
    desc: "Binding-constraint path from your verdict",
    icon: "path",
  },
  "/advisor": {
    desc: "Talk it through",
    icon: "advisor",
    nowDesc: "Your emotional pillar wants a conversation",
  },
  "/journal": {
    desc: "Log the decisions you're making",
    icon: "journal",
  },
  "/household": {
    desc: "Shared readiness, couples, family",
    icon: "couples",
  },
};

/**
 * Dashboard instrument grid — only routes that are allowed in chrome or
 * explicit palette lead-gen. Launch-hidden catalog entries (palette: false
 * with no header surface) are never listed.
 */
function buildActions(): Action[] {
  const byHref = new Map(NAV_CATALOG.map((e) => [e.href, e]));
  const order = [
    "/money",
    "/assessment",
    "/shadow-score",
    "/path",
    "/plan",
    "/journal",
    "/advisor",
    "/household",
  ];

  const out: Action[] = [];
  for (const href of order) {
    const entry = byHref.get(href);
    const copy = ACTION_COPY[href];
    if (!entry || !copy) continue;
    // Skip launch-hidden (no header, palette false)
    const hidden =
      !entry.surfaces.header && entry.surfaces.palette === false;
    if (hidden) continue;
    out.push({
      href,
      label: entry.paletteLabel ?? entry.label,
      desc: copy.desc,
      icon: copy.icon,
      nowDesc: copy.nowDesc,
    });
  }
  return out;
}

const ACTIONS = buildActions();

function ActionIcon({ icon, size = 22 }: { icon: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={COLORS.cyan}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[icon] ?? ICONS.money}
    </svg>
  );
}

/**
 * Quick actions, curated: the three most relevant instruments for the user's
 * current state lead, with the full grid demoted below.
 */
export function QuickActionGrid({
  journalCount,
  featured = [],
}: {
  journalCount: number;
  featured?: string[];
}) {
  const resolveAction = (href: string): Action | undefined => {
    const direct = ACTIONS.find((a) => a.href === href);
    if (direct) return direct;
    // Contextual actions may deep-link Money modes — collapse those to Money.
    // Launch-hidden labs (/daily, /signals, /simulator) are never featured.
    if (href === "/money/decide" || href === "/money/budget" || href === "/money/plan") {
      const money = ACTIONS.find((a) => a.href === "/money");
      if (!money) return undefined;
      return {
        ...money,
        href,
        nowDesc:
          href === "/money/decide"
            ? "Your financial pillar is the one to work — open Decide"
            : money.nowDesc,
      };
    }
    return undefined;
  };

  const featuredActions = featured
    .map((href) => resolveAction(href))
    .filter((a): a is Action => Boolean(a));
  const featuredHrefs = new Set(featuredActions.map((a) => a.href));
  const rest = ACTIONS.filter((a) => {
    if (featuredHrefs.has(a.href)) return false;
    if (
      a.href === "/money" &&
      featured.some((h) => h === "/money" || h.startsWith("/money/"))
    ) {
      return false;
    }
    return true;
  });

  return (
    <div>
      {featuredActions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {featuredActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="glass glass-hover panel-focus sweep flex flex-col gap-3 p-5"
            >
              <div className="flex items-center justify-between">
                <ActionIcon icon={action.icon} />
                <span className="chip !text-2xs">Now</span>
              </div>
              <div>
                <span className="font-semibold text-light">{action.label}</span>
                <p className="mt-1 text-xs text-dim">{action.nowDesc ?? action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className={`eyebrow ${featuredActions.length > 0 ? "mt-6" : ""}`}>All instruments</p>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {rest.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="glass glass-hover flex flex-col gap-3 p-5"
          >
            <ActionIcon icon={action.icon} />
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
    </div>
  );
}
