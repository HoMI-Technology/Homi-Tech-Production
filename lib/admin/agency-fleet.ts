/**
 * HōMI Marketing Agency OS — agent fleet catalog.
 * CEO watches this board; each agent owns a desk (UI panel) + optional AI actions.
 */

export type AgentStatus = "online" | "needs_you" | "idle" | "blocked";

export type AgencyAgentId =
  | "strategy"
  | "content"
  | "calendar"
  | "audience"
  | "email"
  | "performance"
  | "competitive"
  | "publish"
  | "guardrails"
  | "library";

export type AgencyAgent = {
  id: AgencyAgentId;
  name: string;
  role: string;
  /** One-line job for the CEO board. */
  mandate: string;
  deskId: string;
  /** AI actions this agent can run via /api/admin/marketing-ai */
  aiActions: string[];
};

/** Ordered for the CEO board (left → right, priority). */
export const AGENCY_FLEET: AgencyAgent[] = [
  {
    id: "strategy",
    name: "Strategy",
    role: "Chief of staff",
    mandate: "North star, weekly scorecard, GTM lock, kill criteria",
    deskId: "desk-strategy",
    aiActions: ["scorecard_summary"],
  },
  {
    id: "content",
    name: "Content",
    role: "Creative lead",
    mandate: "Founder posts, captions, image briefs, claim-clean copy",
    deskId: "desk-content",
    aiActions: ["generate_post", "caption", "image_brief", "repurpose"],
  },
  {
    id: "calendar",
    name: "Calendar",
    role: "Publisher",
    mandate: "30-day themes, Mon/Wed/Fri cadence, slot ownership",
    deskId: "desk-calendar",
    aiActions: [],
  },
  {
    id: "audience",
    name: "Audience",
    role: "Insights",
    mandate: "Verdict mix, channels, waitlist demand → content backlog",
    deskId: "desk-audience",
    aiActions: ["audience_insight"],
  },
  {
    id: "email",
    name: "Email",
    role: "Lifecycle",
    mandate: "Owned list, launch drip, campaigns, Resend health",
    deskId: "desk-email",
    aiActions: ["drip_sequence"],
  },
  {
    id: "performance",
    name: "Performance",
    role: "Analytics",
    mandate: "Post log, LinkedIn CSV import, what to double down on",
    deskId: "desk-performance",
    aiActions: ["analytics_summary"],
  },
  {
    id: "competitive",
    name: "Competitive",
    role: "Intel",
    mandate: "Hand-logged competitor hooks → gaps HōMI can own",
    deskId: "desk-competitive",
    aiActions: ["competitor_analysis"],
  },
  {
    id: "publish",
    name: "Publish",
    role: "Distribution",
    mandate: "Webhook / Zapier handoff when copy is CEO-approved",
    deskId: "desk-publish",
    aiActions: [],
  },
  {
    id: "guardrails",
    name: "Guardrails",
    role: "Compliance",
    mandate: "Claim law, never-say, “are you a lender?” scripts",
    deskId: "desk-guardrails",
    aiActions: [],
  },
  {
    id: "library",
    name: "Library",
    role: "Brand ops",
    mandate: "Assets, GTM docs, press, demos — public/marketing SoT",
    deskId: "desk-library",
    aiActions: [],
  },
];

export type FleetSignals = {
  aiEnabled: boolean;
  resendConfigured: boolean;
  uniqueActivated7d: number;
  accountsLast7: number;
  waitlistTotal: number;
  campaignDrafts: number;
  campaignSent: number;
  metricsCapped: boolean;
};

export type FleetAgentView = AgencyAgent & {
  status: AgentStatus;
  statusLabel: string;
};

/**
 * Derive live fleet status from page signals (no extra DB).
 * CEO board reads this — agents never invent "healthy" without evidence.
 */
export function evaluateFleet(signals: FleetSignals): FleetAgentView[] {
  return AGENCY_FLEET.map((agent) => {
    switch (agent.id) {
      case "strategy":
        if (signals.metricsCapped) {
          return {
            ...agent,
            status: "needs_you" as const,
            statusLabel: "Sample capped — numbers may undercount",
          };
        }
        if (signals.accountsLast7 > 0 && signals.uniqueActivated7d === 0) {
          return {
            ...agent,
            status: "needs_you" as const,
            statusLabel: "Signups without activations — path friction",
          };
        }
        return {
          ...agent,
          status: "online" as const,
          statusLabel: signals.aiEnabled
            ? "Scorecard AI ready"
            : "Template scorecard (no AI key)",
        };
      case "content":
        return {
          ...agent,
          status: signals.aiEnabled ? ("online" as const) : ("idle" as const),
          statusLabel: signals.aiEnabled
            ? "Studio + claim strip online"
            : "Templates only — add ANTHROPIC_API_KEY",
        };
      case "calendar":
        return {
          ...agent,
          status: "online" as const,
          statusLabel: "Theme rotation + posting days live",
        };
      case "audience":
        return {
          ...agent,
          status: "online" as const,
          statusLabel: signals.aiEnabled
            ? "Insight agent ready"
            : "Data panels live · AI optional",
        };
      case "email":
        if (!signals.resendConfigured) {
          return {
            ...agent,
            status: "blocked" as const,
            statusLabel: "Resend key missing — cannot send",
          };
        }
        if (signals.waitlistTotal > 0 && signals.campaignDrafts === 0 && signals.campaignSent === 0) {
          return {
            ...agent,
            status: "needs_you" as const,
            statusLabel: "Waitlist warm — load drip drafts",
          };
        }
        return {
          ...agent,
          status: "online" as const,
          statusLabel: "ESP configured · campaigns available",
        };
      case "performance":
        return {
          ...agent,
          status: signals.aiEnabled ? ("online" as const) : ("idle" as const),
          statusLabel: "Log posts · import LinkedIn CSV",
        };
      case "competitive":
        return {
          ...agent,
          status: "idle" as const,
          statusLabel: "Hand-log hooks (no scraping)",
        };
      case "publish":
        return {
          ...agent,
          status: "idle" as const,
          statusLabel: "Webhook idle until you approve copy",
        };
      case "guardrails":
        return {
          ...agent,
          status: "online" as const,
          statusLabel: "Claim law armed",
        };
      case "library":
        return {
          ...agent,
          status: "online" as const,
          statusLabel: "public/marketing SoT",
        };
      default:
        return { ...agent, status: "idle" as const, statusLabel: "—" };
    }
  });
}

export function fleetSummary(agents: FleetAgentView[]): {
  online: number;
  needsYou: number;
  blocked: number;
  idle: number;
} {
  return agents.reduce(
    (acc, a) => {
      if (a.status === "online") acc.online += 1;
      else if (a.status === "needs_you") acc.needsYou += 1;
      else if (a.status === "blocked") acc.blocked += 1;
      else acc.idle += 1;
      return acc;
    },
    { online: 0, needsYou: 0, blocked: 0, idle: 0 },
  );
}
