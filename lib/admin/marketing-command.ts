/**
 * Static catalog for the Marketing command center (/admin/marketing).
 * Ops doctrine + asset map — no side effects. Live metrics come from the page.
 */

export type LibraryItem = {
  label: string;
  href: string;
  hint: string;
  /** true → open in new tab (static files, external). false → same-tab app routes */
  external?: boolean;
};

export type LibrarySection = {
  id: string;
  title: string;
  subtitle: string;
  items: LibraryItem[];
};

/** Locked founder decisions (GTM OS §1) — display only. */
export const MARKETING_LOCK = {
  channel: "LinkedIn founder",
  secondary: "Owned email list",
  northStar: "Weekly activations (completed readiness path)",
  hoursPerWeek: "10–12 hrs",
  phThisQuarter: "No",
  pressEmail: "hello@homitechnology.com",
  pricing: "Free path · Plus $9.99 · Pro $24.99 · Family $39.99 / mo",
  icp: "Major commitment; “afford but not sure I’ll be okay” (home wedge)",
  antiIcp: "Rate shoppers · approval seekers · credit-score replacement",
  claimOneLiner:
    "Educational guidance only. Not a lender. Not a credit score replacement.",
} as const;

/** Never-say lines for the claim-law panel (meta: prohibition list). */
// brand-ok: entire array is a prohibition registry — these strings are what we refuse to say, not claims we make
export const CLAIM_NEVER_SAY = [
  "Approved / pre-approved / pre-qualified / you qualify",
  "Guaranteed / risk-free / will buy by DATE", // brand-ok: prohibition — listing what we never claim
  "Replaces your credit score", // brand-ok: prohibition — listing what we never claim
  "Our lenders / best deal / unlock your dream home", // brand-ok: prohibition — listing what we never claim
  "Bank-level / military-grade security", // brand-ok: prohibition — listing what we never claim
  "This is financial advice",
] as const;

export const CLAIM_PREFER = [
  "Educational guidance only",
  "Decision readiness / readiness signal",
  "Afford ≠ ready · Not yet is not no",
  "Build First is the map",
  "Not a lender · not a credit score replacement",
] as const;

/** This-week engine posts from ENGINE-2-WEEKS (Week 1 default slate). */
export const ENGINE_WEEK_POSTS: {
  day: string;
  title: string;
  asset: string;
  campaign: string;
}[] = [
  {
    day: "Mon",
    title: "Founder why",
    asset: "/marketing/content/posts/homi_post_founder_why_1080.png",
    campaign: "w1_founder_why",
  },
  {
    day: "Wed",
    title: "Afford ≠ ready",
    asset: "/marketing/content/posts/homi_post_quote_afford_vs_ready_1080.png",
    campaign: "w1_afford",
  },
  {
    day: "Fri",
    title: "Build First",
    asset: "/marketing/content/posts/homi_post_quote_build_first_1080.png",
    campaign: "w1_build_first",
  },
];

export const QUICK_ACTIONS: LibraryItem[] = [
  {
    label: "Compose email",
    href: "/admin/email",
    hint: "Broadcast drafts · Resend",
  },
  {
    label: "Waitlist",
    href: "/admin/waitlist",
    hint: "Demand queue",
  },
  {
    label: "Attribution",
    href: "/admin/attribution",
    hint: "Channels · UTM · conversion",
  },
  {
    label: "Ad spend",
    href: "/admin/ad-spend",
    hint: "Paid media ledger",
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    hint: "Product analytics",
  },
  {
    label: "Public site",
    href: "/",
    hint: "homitechnology.com",
    external: true,
  },
  {
    label: "Assessment (UTM)",
    href: "/assessment?utm_source=admin&utm_medium=ops&utm_campaign=command_center",
    hint: "Test activation path",
  },
  {
    label: "Guides hub",
    href: "/guides",
    hint: "SEO compounder",
    external: true,
  },
];

export const LIBRARY_SECTIONS: LibrarySection[] = [
  {
    id: "ops",
    title: "Operate",
    subtitle: "Run the OS — not more graphics",
    items: [
      {
        label: "Founder 30-min setup",
        href: "/marketing/gtm/FOUNDER-30-MIN.md",
        hint: "LinkedIn · first post · Resend · admin",
        external: true,
      },
      {
        label: "Engine · 2 weeks",
        href: "/marketing/gtm/ENGINE-2-WEEKS.md",
        hint: "Post calendar · daily engagements",
        external: true,
      },
      {
        label: "Week 1 scoreboard",
        href: "/marketing/gtm/weeks/WEEK-1-SCOREBOARD.md",
        hint: "Fill Sunday from this page",
        external: true,
      },
      {
        label: "Week 2 scoreboard",
        href: "/marketing/gtm/weeks/WEEK-2-SCOREBOARD.md",
        hint: "Compare + gate after W2",
        external: true,
      },
      {
        label: "Execution status",
        href: "/marketing/gtm/EXECUTION-STATUS.md",
        hint: "7 workstreams checklist",
        external: true,
      },
      {
        label: "GTM OS (master)",
        href: "/marketing/gtm/HOMI-SOLO-GTM-OS.md", // brand-ok: asset filename on disk, not user-visible text
        hint: "Doctrine · kill criteria · phases",
        external: true,
      },
      {
        label: "Launch day",
        href: "/marketing/gtm/LAUNCH_DAY.md",
        hint: "Only after engine runs",
        external: true,
      },
      {
        label: "Support: lender script",
        href: "/marketing/gtm/SUPPORT-ARE-YOU-A-LENDER.md",
        hint: "Copy-paste under growth pressure",
        external: true,
      },
    ],
  },
  {
    id: "brand",
    title: "Brand kit",
    subtitle: "Avatars · covers · logos · OG",
    items: [
      {
        label: "Avatar 512",
        href: "/marketing/brand/avatars/homi-threshold-compass-avatar-512.png",
        hint: "LinkedIn / X profile",
        external: true,
      },
      {
        label: "LinkedIn personal cover",
        href: "/marketing/brand/covers/homi_cover_linkedin_personal_1584x396_v1.png",
        hint: "1584×396",
        external: true,
      },
      {
        label: "LinkedIn page cover",
        href: "/marketing/brand/covers/homi_cover_linkedin_page_4200x700_v1.png",
        hint: "Company Page",
        external: true,
      },
      {
        label: "X header",
        href: "/marketing/brand/covers/homi_cover_x_header_1500x500_v1.png",
        hint: "1500×500",
        external: true,
      },
      {
        label: "OG home",
        href: "/marketing/brand/og/homi_og_home_1200x630_v1.png",
        hint: "Link previews",
        external: true,
      },
      {
        label: "Wordmark SVG",
        href: "/marketing/brand/logos/homi-wordmark.svg",
        hint: "Press / web",
        external: true,
      },
    ],
  },
  {
    id: "content",
    title: "Content fuel",
    subtitle: "Posts · carousels · captions",
    items: [
      {
        label: "Captions library",
        href: "/marketing/content/copy/CAPTIONS.md",
        hint: "Claim-safe captions",
        external: true,
      },
      {
        label: "Founder voice",
        href: "/marketing/content/copy/FOUNDER_VOICE.md",
        hint: "Wally posts",
        external: true,
      },
      {
        label: "Content calendar (2 wk)",
        href: "/marketing/content/copy/CONTENT_CALENDAR_2_WEEKS.md",
        hint: "Backup schedule",
        external: true,
      },
      {
        label: "Afford ≠ ready carousel",
        href: "/marketing/content/carousels/afford-vs-ready/01.png",
        hint: "5 slides",
        external: true,
      },
      {
        label: "Founder why post",
        href: "/marketing/content/posts/homi_post_founder_why_1080.png",
        hint: "Week 1 Mon default",
        external: true,
      },
      {
        label: "Stories pack",
        href: "/marketing/content/stories/homi_story_1080x1920_v1.png",
        hint: "9:16",
        external: true,
      },
    ],
  },
  {
    id: "launch",
    title: "Launch & press",
    subtitle: "Emails · PH · demo · screens",
    items: [
      {
        label: "Launch emails (4)",
        href: "/marketing/launch/emails/README.md",
        hint: "Load into /admin/email",
        external: true,
      },
      {
        label: "Press one-pager PDF",
        href: "/marketing/launch/press-kit/pdf/HOMI-One-Pager-Partners-Investors.pdf", // brand-ok: asset filename on disk, not user-visible text
        hint: "Partners / investors",
        external: true,
      },
      {
        label: "FAQ PDF",
        href: "/marketing/launch/press-kit/pdf/HOMI-FAQ.pdf", // brand-ok: asset filename on disk, not user-visible text
        hint: "Press kit",
        external: true,
      },
      {
        label: "Demo 60s",
        href: "/marketing/launch/demo-video/HOMI-Demo-60s.mp4", // brand-ok: asset filename on disk, not user-visible text
        hint: "Slideshow until VO upgrade",
        external: true,
      },
      {
        label: "Demo VO brief",
        href: "/marketing/launch/demo-video/DEMO-VO-BRIEF.md",
        hint: "Shot list + claim law",
        external: true,
      },
      {
        label: "PH gallery (live UI)",
        href: "/marketing/launch/product-hunt/gallery-live/homi_ph_live_01_home.png",
        hint: "Prefer live screens",
        external: true,
      },
      {
        label: "Live product screens",
        href: "/marketing/screenshots/live/homi_live_01_home.png",
        hint: "Production captures",
        external: true,
      },
    ],
  },
  {
    id: "seo",
    title: "SEO & public pages",
    subtitle: "Compounding content",
    items: [
      {
        label: "Afford ≠ ready",
        href: "/guides/afford-is-not-ready",
        hint: "Primary message hub",
        external: true,
      },
      {
        label: "What HōMI isn’t",
        href: "/guides/what-homi-is-not",
        hint: "Bright lines public",
        external: true,
      },
      {
        label: "All guides",
        href: "/guides",
        hint: "Hub",
        external: true,
      },
      {
        label: "Pricing",
        href: "/pricing",
        hint: "SHIPPED tiers",
        external: true,
      },
      {
        label: "How it works",
        href: "/how-it-works",
        hint: "Product story",
        external: true,
      },
      {
        label: "Waitlist public",
        href: "/waitlist",
        hint: "Capture",
        external: true,
      },
    ],
  },
];

export function buildUtmUrl(opts: {
  path?: string;
  source: string;
  medium: string;
  campaign: string;
  base?: string;
}): string {
  const base = (opts.base ?? "https://homitechnology.com").replace(/\/$/, "");
  const path = opts.path?.startsWith("/") ? opts.path : `/${opts.path ?? "assessment"}`;
  const u = new URL(`${base}${path}`);
  u.searchParams.set("utm_source", opts.source);
  u.searchParams.set("utm_medium", opts.medium);
  u.searchParams.set("utm_campaign", opts.campaign);
  return u.toString();
}

/** Canonical Today strip secondaries (PR1+). Claim/Library/Create never appear here. */
export type TodayCta = {
  label: string;
  href: string;
  external?: boolean;
};

const TODAY_SECONDARIES_DEFAULT: TodayCta[] = [
  { label: "Engine", href: "#engine" },
  { label: "Proof", href: "#proof" },
  { label: "Email", href: "/admin/email" },
  {
    label: "Scoreboard",
    href: "/marketing/gtm/weeks/WEEK-1-SCOREBOARD.md",
    external: true,
  },
];

const TODAY_SECONDARIES_SUNDAY: TodayCta[] = [
  {
    label: "Scoreboard",
    href: "/marketing/gtm/weeks/WEEK-1-SCOREBOARD.md",
    external: true,
  },
  { label: "Engine", href: "#engine" },
  { label: "Proof", href: "#proof" },
  { label: "Email", href: "/admin/email" },
];

/**
 * True when the current weekday in America/New_York is Sunday.
 * Independent of engine week-id strings (PR1 Sunday bias).
 */
export function isSundayInNy(now: Date = new Date()): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
  }).format(now);
  return weekday === "Sun";
}

/**
 * Secondary Today CTAs. On Sunday (NY), Scoreboard is first.
 * When primary attention CTA is already Scoreboard, omit the Scoreboard secondary.
 */
export function todaySecondaryCtas(opts?: {
  now?: Date;
  primaryIsScoreboard?: boolean;
}): TodayCta[] {
  const base = isSundayInNy(opts?.now) ? TODAY_SECONDARIES_SUNDAY : TODAY_SECONDARIES_DEFAULT;
  if (!opts?.primaryIsScoreboard) return base;
  return base.filter((c) => c.label !== "Scoreboard");
}

/** Truncate mission chip / claim line for instrument calm. */
export function truncateLabel(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}
