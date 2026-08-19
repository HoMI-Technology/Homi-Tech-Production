import { AGENTS, type AgentMode } from "../agents/registry";
import { BRAND, PILLARS, VERDICT_META, type VerdictKey } from "../brand";
import { VERDICT_CONFIG } from "../scoring/verdicts";
import { ARCHITECTURE_CALCULATORS } from "./calculators";
import { ARCHITECTURE_BRAND, ARCHITECTURE_COMPLIANCE } from "./compliance";
import { ARCHITECTURE_GAPS } from "./gaps";
import { TOOL_ALIASES } from "./tool-aliases";
import type {
  ArchitectureAgent,
  ArchitectureApiRoute,
  ArchitectureComponentDir,
  ArchitectureDbTable,
  ArchitectureDocument,
  ArchitectureLibModule,
  ArchitectureProductRoute,
  ArchitectureScoringEngine,
} from "./types";

const FEED_VERSION = "v1";

const AGENT_MODE: Record<string, AgentMode> = {
  homie: "explore",
  scout: "compare",
  analyst: "analyze",
  coach: "decompress",
  architect: "plan",
  oracle: "simulate",
  sentinel: "explore",
};

const AGENT_BOUNDARY: Record<string, string> = {
  homie: "Never pressures conversion. Never suggests paid actions.",
  scout: "Presents alternatives, never picks for you.",
  analyst: "Educational math only. No product advice.",
  coach: "Not a therapist. Identifies but does not treat.",
  architect: "Build plans, not financial advice.",
  oracle: "Simulates, never predicts with certainty.",
  sentinel: "Cannot be bypassed. Monitors all interactions for safety and compliance.",
};

/** Known tables from migrations / product usage — descriptive, not a live schema dump. */
export const ARCHITECTURE_DB_TABLES: ArchitectureDbTable[] = [
  {
    name: "profiles",
    columns: ["id", "email", "subscription_tier", "role"],
    rls: true,
    category: "user",
    description: "User profile and tier",
  },
  {
    name: "assessments",
    columns: ["id", "user_id", "score", "verdict", "pillars"],
    rls: true,
    category: "user",
    description: "Scored readiness assessments",
  },
  {
    name: "checkins",
    columns: ["id", "user_id", "mood", "created_at"],
    rls: true,
    category: "user",
    description: "Daily pulse check-ins",
  },
  {
    name: "journal_entries",
    columns: ["id", "user_id", "body"],
    rls: true,
    category: "user",
    description: "Decision journal",
  },
  {
    name: "outcomes",
    columns: ["id", "user_id", "assessment_id"],
    rls: true,
    category: "user",
    description: "Post-decision outcomes",
  },
  {
    name: "behavioral_genome",
    columns: ["id", "user_id", "traits"],
    rls: true,
    category: "user",
    description: "Behavioral genome snapshot",
  },
  {
    name: "couples",
    columns: ["id", "user_id"],
    rls: true,
    category: "user",
    description: "Couples mode state",
  },
  {
    name: "plaid_items",
    columns: ["id", "user_id"],
    rls: true,
    category: "user",
    description: "Linked bank items",
  },
  {
    name: "plaid_accounts",
    columns: ["id", "item_id"],
    rls: true,
    category: "user",
    description: "Linked accounts",
  },
  {
    name: "plaid_transactions",
    columns: ["id", "account_id"],
    rls: true,
    category: "user",
    description: "Synced transactions",
  },
  {
    name: "plaid_account_owners",
    columns: ["id", "user_id", "account_id"],
    rls: true,
    category: "user",
    description: "Bank-file Identity owners (service-role only)",
  },
  {
    name: "plaid_securities",
    columns: ["security_id"],
    rls: true,
    category: "user",
    description: "Plaid investment securities catalog",
  },
  {
    name: "plaid_holdings",
    columns: ["id", "user_id", "security_id"],
    rls: true,
    category: "user",
    description: "Plaid investment holdings",
  },
  {
    name: "plaid_investment_transactions",
    columns: ["id", "user_id"],
    rls: true,
    category: "user",
    description: "Plaid investment transactions",
  },
  {
    name: "plaid_liabilities",
    columns: ["id", "user_id", "account_id"],
    rls: true,
    category: "user",
    description: "Plaid credit/student/mortgage liabilities",
  },
  {
    name: "credit_snapshots",
    columns: ["id", "user_id", "score"],
    rls: true,
    category: "user",
    description: "Self-reported / snapshot credit",
  },
  {
    name: "financial_snapshots",
    columns: ["id", "user_id"],
    rls: true,
    category: "user",
    description: "Periodic finance snapshots",
  },
  {
    name: "user_finance_state",
    columns: ["user_id", "payload"],
    rls: true,
    category: "user",
    description: "Finance dashboard persistence",
  },
  {
    name: "finance_savings_goals",
    columns: [
      "id",
      "user_id",
      "name",
      "goal_type",
      "target_amount_cents",
      "current_amount_cents",
      "status",
    ],
    rls: true,
    category: "user",
    description: "Savings goals ledger (replaces legacy goals table)",
  },
  {
    name: "advisor_conversations",
    columns: ["id", "user_id"],
    rls: true,
    category: "user",
    description: "Companion threads",
  },
  {
    name: "advisor_messages",
    columns: ["id", "conversation_id", "role"],
    rls: true,
    category: "user",
    description: "Companion messages",
  },
  {
    name: "advisor_usage",
    columns: ["user_id", "day", "count"],
    rls: true,
    category: "user",
    description: "Daily companion quota",
  },
  {
    name: "question_bank",
    columns: ["id", "pillar", "prompt"],
    rls: true,
    category: "platform",
    description: "Canonical assessment questions",
  },
  {
    name: "score_shares",
    columns: ["id", "assessment_id", "token"],
    rls: true,
    category: "user",
    description: "Public score share links",
  },
  {
    name: "shadow_shares",
    columns: ["id", "token"],
    rls: true,
    category: "user",
    description: "Anonymous shadow-score shares",
  },
  {
    name: "receipt_verifications",
    columns: ["id", "user_id"],
    rls: true,
    category: "user",
    description: "Receipt verification records",
  },
  {
    name: "partner_codes",
    columns: ["id", "code"],
    rls: true,
    category: "b2b",
    description: "Partner invite codes",
  },
  {
    name: "partner_api_keys",
    columns: ["id", "partner_id"],
    rls: true,
    category: "b2b",
    description: "Partner API keys",
  },
  {
    name: "organizations",
    columns: ["id", "name"],
    rls: true,
    category: "b2b",
    description: "B2B organizations",
  },
  {
    name: "organization_members",
    columns: ["org_id", "user_id", "role"],
    rls: true,
    category: "b2b",
    description: "Org membership",
  },
  {
    name: "campaigns",
    columns: ["id", "name"],
    rls: true,
    category: "platform",
    description: "Marketing campaigns",
  },
  {
    name: "campaign_sends",
    columns: ["id", "campaign_id"],
    rls: true,
    category: "platform",
    description: "Campaign send log",
  },
  {
    name: "email_sends",
    columns: ["id", "template"],
    rls: true,
    category: "platform",
    description: "Transactional email log",
  },
  {
    name: "email_unsubscribes",
    columns: ["email"],
    rls: true,
    category: "platform",
    description: "Email unsubscribe list",
  },
  {
    name: "push_subscriptions",
    columns: ["id", "user_id"],
    rls: true,
    category: "user",
    description: "Web push subscriptions",
  },
  {
    name: "calendar_events",
    columns: ["id", "user_id", "starts_at"],
    rls: true,
    category: "user",
    description: "Decision calendar events",
  },
  {
    name: "family_accounts",
    columns: ["id", "owner_id"],
    rls: true,
    category: "user",
    description: "Household / family seats",
  },
  {
    name: "audit_log",
    columns: ["id", "actor_id", "action"],
    rls: true,
    category: "platform",
    description: "Admin audit trail",
  },
  {
    name: "webhook_events",
    columns: ["event_id"],
    rls: true,
    category: "platform",
    description: "Stripe webhook idempotency",
  },
  {
    name: "waitlist",
    columns: ["id", "email"],
    rls: true,
    category: "platform",
    description: "Launch waitlist",
  },
  {
    name: "outcome_surveys",
    columns: ["id", "assessment_id"],
    rls: true,
    category: "user",
    description: "Outcome satisfaction surveys",
  },
  {
    name: "payments",
    columns: ["id", "user_id", "stripe_id"],
    rls: true,
    category: "platform",
    description: "Payment records",
  },
];

const API_PURPOSES: Record<string, { purpose: string; method: string }> = {
  account: { purpose: "Account management", method: "GET/POST" },
  admin: { purpose: "Admin endpoints", method: "GET" },
  advisor: { purpose: "AI companion chat (Claude)", method: "POST" },
  agents: { purpose: "AI agent system", method: "POST" },
  assessments: { purpose: "Assessment CRUD + scoring", method: "GET/POST" },
  billing: { purpose: "Stripe billing portal", method: "GET" },
  checkout: { purpose: "Stripe checkout session", method: "POST" },
  cron: { purpose: "Scheduled jobs", method: "POST" },
  "csp-report": { purpose: "CSP violation reporting", method: "POST" },
  email: { purpose: "Email sending (Resend)", method: "POST" },
  "finance-state": { purpose: "Finance state sync", method: "GET/POST" },
  goals: { purpose: "Goal tracking", method: "GET/POST" },
  healthcheck: { purpose: "Health monitoring", method: "GET" },
  plaid: { purpose: "Bank linking (Plaid)", method: "POST" },
  push: { purpose: "Push notifications", method: "POST" },
  scoring: { purpose: "Score computation", method: "POST" },
  "shadow-shares": { purpose: "Anonymous sharing", method: "GET/POST" },
  shares: { purpose: "Score sharing", method: "GET/POST" },
  trinity: { purpose: "3-perspective AI", method: "POST" },
  twin: { purpose: "Future self letter", method: "POST" },
  unsubscribe: { purpose: "Email unsubscribe", method: "POST" },
  v1: { purpose: "API versioning surface", method: "GET" },
  waitlist: { purpose: "Waitlist signup", method: "POST" },
  webhooks: { purpose: "Stripe webhooks", method: "POST" },
};

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function categorizePath(path: string): string {
  if (path.startsWith("/tools")) return "Tools";
  if (path.startsWith("/admin")) return "Admin";
  if (path.startsWith("/auth")) return "Auth";
  if (path.startsWith("/legal") || path === "/unsubscribe") return "Legal";
  if (
    ["/advisor", "/agents", "/agent-hub", "/trinity", "/twin"].some(
      (p) => path === p || path.startsWith(`${p}/`),
    )
  ) {
    return "AI Companion";
  }
  if (
    ["/assessment", "/results", "/shadow-score", "/plan", "/report"].some(
      (p) => path === p || path.startsWith(`${p}/`),
    )
  ) {
    return "Assessment";
  }
  if (
    ["/dashboard", "/settings", "/onboarding", "/money", "/credit"].some(
      (p) => path === p || path.startsWith(`${p}/`),
    )
  ) {
    return "Dashboard";
  }
  if (
    [
      "/",
      "/pricing",
      "/method",
      "/how-it-works",
      "/waitlist",
      "/learning",
      "/blog",
      "/guides",
      "/about",
    ].includes(path)
  ) {
    return "Marketing";
  }
  return "Product";
}

export function buildScoringEngine(): ArchitectureScoringEngine {
  const keys: VerdictKey[] = ["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"];
  // Band boundaries come from the threshold SSOT (lib/scoring/verdicts.ts);
  // each tier's max is the next tier up's min - 1, READY tops out at 100.
  const bands: Record<VerdictKey, { min: number; max: number }> = {
    READY: { min: VERDICT_CONFIG.READY.min, max: 100 },
    ALMOST_THERE: { min: VERDICT_CONFIG.ALMOST_THERE.min, max: VERDICT_CONFIG.READY.min - 1 },
    BUILD_FIRST: {
      min: VERDICT_CONFIG.BUILD_FIRST.min,
      max: VERDICT_CONFIG.ALMOST_THERE.min - 1,
    },
    NOT_YET: { min: VERDICT_CONFIG.NOT_YET.min, max: VERDICT_CONFIG.BUILD_FIRST.min - 1 },
  };

  const verdict_thresholds = Object.fromEntries(
    keys.map((key) => [
      key,
      {
        key,
        label: VERDICT_META[key].label,
        min: bands[key].min,
        max: bands[key].max,
        color: VERDICT_META[key].color,
      },
    ]),
  );

  return {
    description:
      "Deterministic code-only scoring (lib/scoring/engine.ts). AI explains only, never calculates.",
    pillars: PILLARS.map((p) => ({
      key: p.key,
      name: p.name,
      maxScore: p.max,
      color: p.color,
      question: p.question,
    })),
    verdict_thresholds,
    hard_stops: [
      {
        code: "DTI_OVER_50",
        condition: "Debt-to-income > 50%",
        effect: "Forced NOT_YET regardless of score",
      },
      {
        code: "HOUSING_OVER_45",
        condition: "Housing cost > 45% of income",
        effect: "Forced NOT_YET regardless of score",
      },
      {
        code: "RUNWAY_UNDER_1",
        condition: "Less than 1 month runway",
        effect: "Forced NOT_YET regardless of score",
      },
      {
        code: "CREDIT_UNDER_620",
        condition: "Credit score under 620",
        effect: "Forced NOT_YET regardless of score",
      },
    ],
    vocabulary_note:
      "Storage/API enum is NOT_YET; user-facing badge label is DO NOT PROCEED; calm prose may still say “not yet.” See docs/adr/001-verdict-vocabulary.md.",
  };
}

export function buildAgents(): ArchitectureAgent[] {
  return AGENTS.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    mode: AGENT_MODE[a.id] ?? "explore",
    level: a.level,
    boundary: AGENT_BOUNDARY[a.id] ?? a.description,
    color: a.color,
    description: a.description,
  }));
}

export interface ArchitectureScanInput {
  productRoutes: Array<{ path: string; file: string }>;
  apiRouteDirs: string[];
  componentDirs: Array<{ name: string; count: number; examples: string[] }>;
  libModules: Array<{ name: string; purpose: string }>;
  migrationCount: number;
  generated?: string;
  siteUrl?: string;
}

export function buildArchitectureDocument(scan: ArchitectureScanInput): ArchitectureDocument {
  const siteUrl = (
    scan.siteUrl ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "https://homitechnology.com"
  ).replace(/\/$/, "");
  const generated = scan.generated ?? new Date().toISOString().slice(0, 10);

  const product_routes: ArchitectureProductRoute[] = scan.productRoutes
    .map(({ path, file }) => ({
      path,
      name:
        path === "/"
          ? "Landing Page"
          : titleFromSlug(path.split("/").filter(Boolean).pop() ?? path),
      category: categorizePath(path),
      status: "complete" as const,
      features: [],
      file,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  const api_routes: ArchitectureApiRoute[] = scan.apiRouteDirs
    .map((dir) => {
      const meta = API_PURPOSES[dir] ?? { purpose: `${dir} API`, method: "GET/POST" };
      return { path: `/api/${dir}`, purpose: meta.purpose, method: meta.method };
    })
    .sort((a, b) => a.path.localeCompare(b.path));

  const component_directories: ArchitectureComponentDir[] = scan.componentDirs
    .map((d) => ({
      name: d.name,
      count: d.count,
      description: `${d.name} UI module`,
      examples: d.examples,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const lib_modules: ArchitectureLibModule[] = scan.libModules
    .map((m) => ({ name: m.name, purpose: m.purpose }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const ai_agents = buildAgents();
  const calculators = ARCHITECTURE_CALCULATORS;
  const gaps = ARCHITECTURE_GAPS;
  const db_tables = ARCHITECTURE_DB_TABLES;

  return {
    _meta: {
      version: FEED_VERSION,
      generated,
      product: BRAND.name,
      full_name: `${BRAND.legalEntity} — ${BRAND.category}`,
      domain: BRAND.domain,
      repo: "github.com/HoMI-Technology/Homi-Tech-Production" /* brand-ok — GitHub org slug */,
      core_question: "Will you be okay?",
      stack:
        "Next.js 15 + React 19 + TypeScript + Tailwind CSS v4 + Supabase + Stripe + Plaid + Anthropic",
      legal_entity: BRAND.legalEntity,
      feed_url: `${siteUrl}/architecture.json`,
      authority:
        "Executable TypeScript in this repo wins over this document. Prefer lib/scoring, lib/brand, lib/agents/registry on conflict.",
    },
    stats: {
      product_routes: product_routes.length,
      api_routes: api_routes.length,
      component_directories: component_directories.length,
      lib_modules: lib_modules.length,
      db_tables: db_tables.length,
      migrations: scan.migrationCount,
      calculators: calculators.length,
      ai_agents: ai_agents.length,
      gaps: gaps.length,
    },
    product_routes,
    api_routes,
    component_directories,
    lib_modules,
    db_tables,
    ai_agents,
    gaps,
    calculators,
    scoring_engine: buildScoringEngine(),
    brand: ARCHITECTURE_BRAND,
    compliance: ARCHITECTURE_COMPLIANCE,
    tool_aliases: { ...TOOL_ALIASES },
    agent_consumption: {
      protocol: [
        "Fetch architecture.json from the product domain (homitechnology.com), not third-party mirrors.",
        "If _meta.generated is stale or architecture:check would fail, refuse to plan from the feed alone.",
        "For scoring, verdicts, and agent levels: open lib/* when the feed disagrees.",
        "Treat gaps[].severity as a hint; verify each issue in the repo before scheduling work.",
        "Never emit calculator paths that are not in calculators[].route.",
        "Never copy non-canon hex colors into product code — brand-check bans the orange/red Tailwind defaults." /* brand-ok */,
      ],
      smoke_test:
        'jq -e \'((.ai_agents[] | select(.id=="oracle") | .level) == 10) and (([.calculators[].route] | map(select(test("mortgage-payment|home-equity|apr-comparison"))) | length) == 0)\'',
    },
  };
}

/** Stable JSON stringify for committed public/architecture.json (2-space, trailing newline). */
export function serializeArchitectureDocument(doc: ArchitectureDocument): string {
  return `${JSON.stringify(doc, null, 2)}\n`;
}
