/**
 * T3 source-lock facts extracted from existing readFileSync + toContain /
 * toMatch tests. Each fact is one (it(), file) group. Do not invent or drop
 * invariants — the AST-backed runner must be able to replace those greps
 * without losing an assertion.
 *
 * codeMustMatch / codeMustNotMatch are regex *source* strings (no flags).
 * Original `/foo/i` cases are noted in comments next to the fact.
 */

export type SourceLockFact = {
  id: string;
  file: string;
  identifiersMust?: string[];
  identifiersMustNot?: string[];
  stringsMust?: string[];
  stringsMustNot?: string[];
  importsMust?: string[];
  importsMustNot?: string[];
  codeMust?: string[];
  codeMustNot?: string[];
  codeMustMatch?: string[];
  codeMustNotMatch?: string[];
};

export type CssLockFact = {
  id: string;
  file: string;
  mustContain: string[];
  mustNotContain?: string[];
  afterMarker?: string;
  windowChars?: number;
};

export const NAMING_LAW_BANNED = [
  "HōMI-Score",
  "HōMI Score",
  "Homie Score",
  "Homie-Score",
] as const;

export const NAMING_LAW_SURFACES = [
  "components/score/ScoreRail.tsx",
  "components/dashboard/HeroScore.tsx",
  "components/dashboard/ThresholdFold.tsx",
  "components/ui/VerdictBadge.tsx",
  "app/(product)/employee/dashboard/page.tsx",
  "app/(product)/report/[id]/page.tsx",
  "app/share/[token]/page.tsx",
] as const;

export const DECISION_READINESS_SURFACES = [
  "components/score/ScoreRail.tsx",
  "components/dashboard/HeroScore.tsx",
  "components/dashboard/ThresholdFold.tsx",
  "app/(product)/report/[id]/page.tsx",
  "app/share/[token]/page.tsx",
] as const;

const BANNED_FIRST_RUN = ["Get your Shadow Score", "Take the full assessment"] as const;

const SKU_BANNED = [
  "HōMI Companion",
  "Full AI Companion",
  "Get Companion",
  "daily Companion limits",
  "Higher daily Companion limits",
] as const;

const SHADOW_BANNED = [
  "Shadow Score",
  "Get your Shadow Score",
  "Get your score",
  "Start with the free score",
  "Get your score — 90 seconds",
] as const;

const SOLD_LIES = [
  "behavioral genome",
  "Behavioral genome",
  "Up to 5 linked household members",
  "up to 5 household members",
  "5 household members",
] as const;

const VERDICT_BADGES = [
  "DO NOT PROCEED",
  "ALMOST THERE",
  "BUILD FIRST",
  "Build First",
] as const;

const FAKE_SCORE_RANGES = ["80–100", "65–79", "50–64", "0–49"] as const;

const BANNED_PRIMARY_LABELS = [
  "Get your score",
  "Check My Readiness",
  "Check my readiness",
  "See my verdict",
] as const;

const HOW_IT_WORKS_KILLED = [
  "200+ signals",
  "200+ signals. 3 dimensions. 1 score.",
  "equally-weighted",
  "equal weights",
  "weights are a trade secret",
  "HōMI weighs all three pillars equally",
  "We don’t publish exact point values or weights — those are the trade secret.",
  "We don&rsquo;t publish exact point values or weights — those are the trade secret.",
  "shadow version",
  "Get your score — 90 seconds",
  "Every verdict below READY comes with a map",
  "HōMI weighs Financial Reality, Emotional Truth, and Perfect Timing at 35 / 35 / 30, then checks for hard-stops — conditions that override the math entirely because they are not safe to build on top of.",
  "The public weights are 35 / 35 / 30 — Financial Reality, Emotional Truth, Perfect Timing. Here is what each pillar looks at and why it matters.",
  "Three pillars, not equal. Financial Reality 35. Emotional Truth 35. Perfect Timing 30.",
  "Fannie&apos;s manual floor is still 620.",
] as const;

const FIRST_MOMENT_BEAT_LINES = [
  "Most apps want you to buy. I want to know if you’re ready.",
  "I might tell you not yet. Not because I don’t want to help. Because I do.",
  "I look at three things: your finances, your feelings, your timing.",
  "I’m a reflection tool, not a financial advisor.",
  "This is 45 questions. You’ll need an account so the verdict stays yours.",
] as const;

const LEGAL_LIVE_VENDORS = [
  "Vercel",
  "Supabase",
  "Plaid",
  "Stripe",
  "PostHog",
  "Sentry",
  "Resend",
  "Anthropic",
] as const;

const CHROME_HONESTY_SKU_SURFACES = [
  "app/(marketing)/pricing/page.tsx",
  "app/(marketing)/how-it-works/page.tsx",
  "lib/stripe/tiers.ts",
  "lib/advisor/companion-tier-copy.ts",
  "components/layout/QuietHomeFooter.tsx",
] as const;

const PRIMARY_CLOSE_LABEL_SURFACES = [
  "components/layout/SiteHeader.tsx",
  "components/home/InterviewHero.tsx",
  "components/home/walk-copy.ts",
  "app/(marketing)/page.tsx",
  "app/(marketing)/pricing/page.tsx",
  "app/(marketing)/how-it-works/page.tsx",
  "components/layout/SiteFooter.tsx",
  "components/layout/QuietHomeFooter.tsx",
] as const;

const SITE_FOOTER_MOUNTS = [
  "app/(marketing)/layout.tsx",
  "app/(product)/layout.tsx",
  "app/not-found.tsx",
  "app/share/[token]/page.tsx",
] as const;

const REPORT_SIGNIN_PAGES = [
  "app/(product)/report/[id]/page.tsx",
  "app/(product)/report/[id]/credential/page.tsx",
  "app/(product)/report/[id]/print/page.tsx",
] as const;

const SURFACE_ROLE_IMPORTERS = [
  "app/(product)/path/page.tsx",
  "app/(product)/plan/page.tsx",
  "app/(product)/dashboard/page.tsx",
] as const;

const HOMEPAGE_SCROLL_SURFACES = [
  "components/home/InterviewHero.tsx",
  "app/(marketing)/page.tsx",
  "components/home/FrontDoor.tsx",
] as const;

const LEGAL_DATED_PAGES = [
  "app/(marketing)/legal/privacy/page.tsx",
  "app/(marketing)/legal/cookies/page.tsx",
  "app/(marketing)/legal/terms/page.tsx",
] as const;

export const CSS_LOCK_FACTS: CssLockFact[] = [
  {
    id: "fold-wiring/hard-stop-frame",
    file: "app/globals.css",
    mustContain: ['.dash-instrument[data-threshold-fold][data-hard-stop="1"]'],
    mustNotContain: ["#f24822", "inset 3px 0 0 0"],
    afterMarker: '.dash-instrument[data-threshold-fold][data-hard-stop="1"]',
    windowChars: 700,
  },
  {
    id: "verdict-fold-motion/calm-motion-kit",
    file: "app/globals.css",
    mustContain: [
      "--ease-out: cubic-bezier(0.23, 1, 0.32, 1)",
      "--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)",
      ".companion-launcher",
      ".companion-sheet",
      ".companion-typing-dot",
      ".score-reveal",
    ],
  },
  {
    id: "verdict-fold-motion/reduced-motion",
    file: "app/globals.css",
    mustContain: [
      ".companion-typing-dot,",
      ".score-reveal",
      "animation: none;",
      "companion-sheet-in-rm",
    ],
    afterMarker: "prefers-reduced-motion",
  },
  {
    id: "verdict-fold-motion/precise-pointer-hover",
    file: "app/globals.css",
    mustContain: ["@media (hover: hover) and (pointer: fine)"],
  },
];

export const SOURCE_LOCK_FACTS: SourceLockFact[] = [
  // ---------------------------------------------------------------------------
  // __tests__/dashboard/fold-wiring.test.ts
  // ---------------------------------------------------------------------------
  {
    id: "fold-wiring/onboarding-skip",
    file: "app/(product)/onboarding/page.tsx",
    identifiersMust: ["useRouter", "ONBOARDING_SKIP_HREF"],
    identifiersMustNot: ["createClient", "loadLocalResult"],
    stringsMustNot: ["/api/assessments"],
    codeMustMatch: ["router\\.push\\(\\s*ONBOARDING_SKIP_HREF\\s*\\)"],
    codeMustNotMatch: ["\\.update\\(\\s*\\{\\s*onboarding_completed"],
  },
  {
    id: "fold-wiring/hard-stops-named",
    file: "app/(product)/dashboard/page.tsx",
    identifiersMust: [
      "hardStopMessages",
      "hardStopCodes",
      "leadingFoldHardStopCode",
      "hard_stops",
      "stopCode",
    ],
  },
  {
    id: "fold-wiring/path-hard-stop-titles",
    file: "lib/readiness/path.ts",
    stringsMust: [
      "Stabilize emergency runway to at least 1 month",
      "Bring debt-to-income below the protective line",
      "Rebuild credit above the 620 protective floor",
    ],
  },
  {
    id: "fold-wiring/hard-stop-copy-housing-titles",
    file: "lib/assessment/hard-stop-copy.ts",
    stringsMust: [
      "Re-scope housing so payment stays under 45% of income",
      "Re-scope the car so all-in monthly cost stays at or under 20% of take-home",
      "Hard stop · Runway",
      "Hard stop · Payment",
    ],
    stringsMustNot: [
      "Hard stop · runway.",
      "Hard stop · payment.",
      "Hard stop · housing.",
      "Hard stop · credit.",
      "Hard stop · DTI.",
    ],
  },
  {
    id: "fold-wiring/fold-truth-hard-stop-titles",
    file: "lib/dashboard/fold-truth.ts",
    stringsMust: ["Stabilize emergency runway to at least 1 month", "Hard stop · Runway"],
    stringsMustNot: [
      "Bring debt-to-income below the protective line",
      "Re-scope housing so payment stays under 45% of income",
      "Rebuild credit above the 620 protective floor",
      "Hard stop · runway.",
    ],
  },
  {
    id: "fold-wiring/fold-rewrites-no-live-titles",
    file: "components/dashboard/ThresholdFold.tsx",
    stringsMustNot: [
      "Bring debt-to-income below the protective line",
      "Re-scope housing so payment stays under 45% of income",
      "Rebuild credit above the 620 protective floor",
    ],
  },
  {
    id: "fold-wiring/no-verdict-celebrate-fold",
    file: "components/dashboard/ThresholdFold.tsx",
    identifiersMustNot: ["VerdictCelebrate"],
  },
  {
    id: "fold-wiring/no-verdict-celebrate-page",
    file: "app/(product)/dashboard/page.tsx",
    identifiersMustNot: ["VerdictCelebrate"],
  },
  {
    id: "fold-wiring/decision-readiness-score-rail",
    file: "components/score/ScoreRail.tsx",
    stringsMust: ["Decision Readiness Score"],
  },
  {
    id: "fold-wiring/decision-readiness-score-fold",
    file: "components/dashboard/ThresholdFold.tsx",
    identifiersMustNot: ["ScoreRail"],
    stringsMust: ["Decision Readiness Score"],
    stringsMustNot: ["HōMI-Score"],
  },
  {
    id: "fold-wiring/no-homi-score-noun-page",
    file: "app/(product)/dashboard/page.tsx",
    stringsMustNot: ["HōMI-Score"],
  },
  {
    id: "fold-wiring/no-launch-hidden-labs",
    file: "app/(product)/dashboard/page.tsx",
    identifiersMustNot: ["GenomeWidget"],
    stringsMustNot: ["/advisor", "/trinity", "/genome", "Talk to the Companion"],
  },
  {
    id: "fold-wiring/draft-resume-close-fold",
    file: "components/dashboard/ThresholdFold.tsx",
    identifiersMust: ["ThresholdFoldEmptyClose"],
    identifiersMustNot: ["PathNextMove", "DashboardResumeRamp"],
  },
  {
    id: "fold-wiring/fold-analytics-beacon",
    file: "app/(product)/dashboard/page.tsx",
    identifiersMust: ["DashboardFoldBeacon"],
  },
  {
    id: "fold-wiring/no-outcome-survey-fold",
    file: "components/dashboard/ThresholdFold.tsx",
    identifiersMustNot: ["OutcomeSurveyPrompt"],
  },
  {
    id: "fold-wiring/no-outcome-survey-page",
    file: "app/(product)/dashboard/page.tsx",
    identifiersMustNot: ["OutcomeSurveyPrompt"],
  },
  {
    id: "fold-wiring/no-companion-or-money-on-fold",
    file: "components/dashboard/ThresholdFold.tsx",
    identifiersMustNot: [
      "companionFoldLine",
      "HomeMoneyStanding",
      "CompanionHost",
      "CompanionWidget",
      "HomieAvatar",
    ],
    stringsMustNot: ["data-companion-fold-line", "/advisor"],
    codeMustNotMatch: ["data-companion-chat"],
  },
  {
    id: "fold-wiring/companion-host-dashboard-gate",
    file: "components/companion/CompanionHost.tsx",
    codeMust: ['pathname === "/dashboard"'],
  },
  {
    id: "fold-wiring/companion-fold-copy",
    file: "lib/dashboard/fold-truth.ts",
    identifiersMust: ["COMPANION_FOLD_LINES"],
    identifiersMustNot: ["EMPTY_FOLD_HEADING", "EMPTY_FOLD_WHISPER"],
    stringsMust: [
      "A hard stop is the read right now. The path names what has to move first.",
      "Your next honest move is the binding step on Path to Ready.",
      "You have a read. Path to Ready is the map from here.",
      "One measurement and this page has a build to show.",
    ],
    codeMust: ['COMPANION_ESCALATION_HREF = "/advisor"'],
    stringsMustNot: ["Will you be okay?", "Readiness lives here", "EMPTY_FOLD_HEADING", "EMPTY_FOLD_WHISPER"],
  },
  {
    id: "fold-wiring/no-verdict-spectrum",
    file: "app/(product)/dashboard/page.tsx",
    identifiersMustNot: ["DashSpectrum", "shouldPaintDashSpectrum"],
    codeMustNot: ['className="dash-spectrum"'],
    codeMustNotMatch: [">\\s*Not yet\\s*<", ">\\s*Almost\\s*<"],
  },
  {
    id: "fold-wiring/threshold-compass-is-the-fold",
    file: "components/dashboard/ThresholdFold.tsx",
    identifiersMust: [
      "HOME_FOLD_INSTRUMENT",
      "MONEY_WAIT_LINE",
      "foldHardStopEyebrow",
      "foldHomeHoldSentence",
      "foldHardStopOverrideLine",
      "foldScoreAgeLine",
      "stopCode",
      "resolveFoldPathPrimary",
      "verdictMetaFor",
    ],
    identifiersMustNot: [
      "textShadow",
      "VERDICT_META",
      "HomeMoneyStanding",
      "ScoreRail",
      "PathStepLedger",
      "HeroScore",
      "PillarRing",
      "FinancialPositionSection",
      "OperateInstrument",
      "ThresholdCompass",
      "VerdictBadge",
      "SaveStatusBanner",
      "lastReadAgeFrom",
      "EMPTY_FOLD_HEADING",
      "EMPTY_FOLD_WHISPER",
    ],
    stringsMust: [
      "dash-instrument",
      "data-home-fold-score",
      "data-home-fold-age",
      "data-home-fold-verdict",
      "data-path-fold-primary",
      "data-home-fold-score-plate",
      "data-home-money-below-fold",
    ],
    stringsMustNot: [
      "Grow emergency fund toward 3–6 months",
      "35/35/30",
      "data-home-build-hero",
      "data-home-score-rail",
      "data-home-threshold-compass",
      "Your build",
      "Open Money",
      "Connect bank",
      "NOT_YET",
      "from March",
      "from August",
      "SaveStatusBanner",
      "lastReadAgeFrom",
      "Will you be okay?",
      "Readiness lives here",
      "One pass. Then you know.",
    ],
    importsMust: ["@/components/ui/verdict-ssot"],
    importsMustNot: [
      "@/components/brand/ThresholdCompass",
      "@/components/finance/ThresholdCompass",
    ],
    codeMustNot: [
      "hideTemperature={false}",
      "stopMessages[0]",
      'className="eyebrow',
      "COLORS.crimson",
    ],
  },
  {
    id: "fold-wiring/threshold-compass-page",
    file: "app/(product)/dashboard/page.tsx",
    identifiersMust: ["ThresholdFold"],
    identifiersMustNot: ["HeroScore", "PillarRing"],
    stringsMustNot: ["data-dash-shell-compass"],
  },
  {
    id: "fold-wiring/path-fold-primary",
    file: "components/dashboard/ThresholdFold.tsx",
    stringsMustNot: ["Mark done", "Full path", "Start step"],
    codeMust: ["shownPath.title", 'data-path-fold-primary=""'],
  },
  {
    id: "fold-wiring/no-crimson-verdict-meta-page",
    file: "app/(product)/dashboard/page.tsx",
    identifiersMustNot: ["VERDICT_META"],
    codeMust: ["COLORS.cyan"],
  },
  {
    id: "fold-wiring/home-money-off-fold",
    file: "components/dashboard/ThresholdFold.tsx",
    identifiersMustNot: ["HomeMoneyStanding"],
  },
  {
    id: "fold-wiring/home-money-standing-strip",
    file: "components/dashboard/HomeMoneyStanding.tsx",
    identifiersMustNot: ["surplusDisplay"],
    stringsMustNot: ["text-4xl"],
    codeMust: ["btn-ghost btn-sm"],
    codeMustNotMatch: ["btn-primary btn-sm"],
  },
  {
    id: "fold-wiring/first-screen-nav-name",
    file: "lib/layout/nav-catalog.ts",
    codeMustMatch: ['href: "/dashboard"[\\s\\S]*label: "HōMI"'],
    codeMustNotMatch: ['href: "/dashboard"[\\s\\S]*label: "Home"'],
  },
  {
    id: "fold-wiring/fold-no-your-build",
    file: "components/dashboard/ThresholdFold.tsx",
    stringsMustNot: ["Your build"],
  },
  {
    id: "fold-wiring/money-not-header-primary",
    file: "lib/layout/nav-catalog.ts",
    identifiersMust: ["HEADER_PRIMARY_NAV"],
    codeMustMatch: [
      'href: "/money"[\\s\\S]*surfaces: \\{ header: "more", palette: true \\}',
    ],
  },
  {
    id: "fold-wiring/last-read-chrome-no-ledger",
    file: "components/dashboard/LastReadChrome.tsx",
    identifiersMustNot: [
      "loadBudgetLedger",
      "metricsFromLedger",
      "useEffect",
      "lastMoney",
    ],
    stringsMustNot: ["local-ledger"],
  },
  {
    id: "fold-wiring/no-kitchen-sink-body",
    file: "app/(product)/dashboard/page.tsx",
    identifiersMustNot: [
      "QuickActionGrid",
      "FinancialPositionSection",
      "ScoreHistory",
      "DecisionTimeline",
      "MetricRail",
      "ActionDock",
      "OperateInstrument",
      "OperateHeroMeta",
    ],
  },
  {
    id: "fold-wiring/full-assessment-lands-home",
    file: "components/assessment/FullAssessmentFlow.tsx",
    codeMust: ['router.push("/dashboard")'],
    codeMustNotMatch: ["router\\.push\\([\"']/results[\"']\\)"],
  },
  {
    id: "fold-wiring/fold-save-status-banner",
    file: "components/dashboard/ThresholdFold.tsx",
    identifiersMustNot: ["SaveStatusBanner"],
  },
  {
    id: "fold-wiring/empty-dashboard-preset",
    file: "components/ui/EmptyState.tsx",
    // Original greps the slice from "dashboard:" to "signals:" only.
    codeMustMatch: [
      "dashboard:[\\s\\S]*SIGNED_IN_ASSESS_HREF[\\s\\S]*signals:",
      "dashboard:[\\s\\S]*PRIMARY_CLOSE_LABEL[\\s\\S]*signals:",
    ],
    codeMustNotMatch: [
      "dashboard:[\\s\\S]*PRIMARY_CLOSE_HREF[\\s\\S]*signals:",
      "dashboard:[\\s\\S]*secondaryHref[\\s\\S]*signals:",
      "dashboard:[\\s\\S]*secondaryLabel[\\s\\S]*signals:",
      "dashboard:[\\s\\S]*/shadow-score[\\s\\S]*signals:",
      "dashboard:[\\s\\S]*Get your Shadow Score[\\s\\S]*signals:",
      "dashboard:[\\s\\S]*Take the full assessment[\\s\\S]*signals:",
    ],
  },
  {
    id: "fold-wiring/resume-ramp-assess-close",
    file: "components/dashboard/DashboardResumeRamp.tsx",
    identifiersMustNot: ["PRIMARY_CLOSE_HREF", "secondaryHref", "secondaryLabel"],
    stringsMustNot: ["/shadow-score", ...BANNED_FIRST_RUN],
    codeMust: ['preset="dashboard"'],
  },
  {
    id: "fold-wiring/sidebar-workspace-switcher",
    file: "components/layout/AppHeader.tsx",
    identifiersMust: ["DashboardSwitcher"],
    stringsMust: ["data-shell-role"],
  },
  {
    id: "fold-wiring/employee-hub-empty-close",
    file: "app/(product)/employee/dashboard/page.tsx",
    identifiersMustNot: ["ThresholdCompass", "HeroScore", "VerdictBadge", "ThresholdFold"],
    stringsMustNot: [
      "Get your Shadow Score",
      "Private Decision Readiness Score",
      "Continue your build on personal Home",
      "data-employee-score-rail",
      "data-employee-primary",
    ],
    codeMust: ['actionHref="/assessment"', 'actionLabel="Assess"', 'href="/path"', 'tint="transparent"'],
    codeMustNot: ['actionHref="/shadow-score"', 'href: "/plan"', "tint={tint}"],
  },
  {
    id: "fold-wiring/onboarding-no-first-run-ctas",
    file: "app/(product)/onboarding/page.tsx",
    stringsMustNot: ["/shadow-score", ...BANNED_FIRST_RUN],
  },
  {
    id: "fold-wiring/assessment-no-first-run-ctas",
    file: "app/(product)/assessment/page.tsx",
    stringsMustNot: ["/shadow-score", ...BANNED_FIRST_RUN],
  },

  // ---------------------------------------------------------------------------
  // __tests__/dashboard/verdict-fold-motion.test.tsx
  // (HeroScore / PillarRing source + CompanionWidget / AppSidebar motion;
  //  CSS is CSS_LOCK_FACTS; naming law is NAMING_LAW_* + facts below)
  // ---------------------------------------------------------------------------
  {
    id: "verdict-fold-motion/hero-score-no-ticker",
    file: "components/dashboard/HeroScore.tsx",
    identifiersMustNot: ["useCountUp"],
    stringsMustNot: ["count-up", "entrance-state"],
    codeMustNot: ["Math.round(display"],
  },
  {
    id: "verdict-fold-motion/pillar-ring-final-numeral",
    file: "components/dashboard/PillarRing.tsx",
    identifiersMustNot: ["useCountUp"],
    codeMustNot: ["Math.round(displayed)"],
  },
  {
    id: "verdict-fold-motion/companion-widget-calm-sheet",
    file: "components/companion/CompanionWidget.tsx",
    stringsMust: ["companion-sheet", "companion-launcher", "companion-typing-dot"],
    codeMust: ['aria-label="HōMI is thinking"', "min-h-11 min-w-11"],
    codeMustNot: ["hover:scale-105"],
  },
  {
    id: "verdict-fold-motion/sidebar-reduced-motion",
    file: "components/layout/AppHeader.tsx",
    identifiersMustNot: ["useReducedMotion", "AnimatePresence"],
    stringsMustNot: ["Jump to", "DO NOT PROCEED"],
  },
  ...NAMING_LAW_SURFACES.map(
    (file): SourceLockFact => ({
      id: `naming-law/banned-score-noun/${file}`,
      file,
      stringsMustNot: [...NAMING_LAW_BANNED],
    }),
  ),
  ...DECISION_READINESS_SURFACES.map(
    (file): SourceLockFact => ({
      id: `naming-law/decision-readiness-score/${file}`,
      file,
      stringsMust: ["Decision Readiness Score"],
    }),
  ),

  // ---------------------------------------------------------------------------
  // __tests__/dashboard/surface-roles.test.ts (import-enforcement it only)
  // ---------------------------------------------------------------------------
  ...SURFACE_ROLE_IMPORTERS.map(
    (file): SourceLockFact => ({
      id: `surface-roles/imports-ssot/${file}`,
      file,
      importsMust: ["@/lib/dashboard/surface-roles"],
    }),
  ),

  // ---------------------------------------------------------------------------
  // __tests__/dashboard/report-signin-redirect.test.ts
  // ---------------------------------------------------------------------------
  ...REPORT_SIGNIN_PAGES.map(
    (file): SourceLockFact => ({
      id: `report-signin-redirect/${file}`,
      file,
      codeMust: ["signInRedirect("],
      codeMustNotMatch: ['redirect\\("/auth/sign-in"\\)'],
    }),
  ),

  // ---------------------------------------------------------------------------
  // __tests__/dashboard/partner-invite-empty.test.ts
  // ---------------------------------------------------------------------------
  {
    id: "partner/clients-scoped-by-partner-id",
    file: "app/(product)/partner/dashboard/page.tsx",
    stringsMust: ["partner_id"],
    codeMust: ['.eq("partner_id", user.id)'],
  },
  {
    id: "partner-invite-empty/mint-requires-code",
    file: "app/(product)/partner/dashboard/page.tsx",
    stringsMust: ["first-moment?ref=", "Could not mint an invite code"],
    stringsMustNot: ["shadow-score?ref=", "Shadow Score"],
    codeMust: ["const inviteUrl = partnerCode ?"],
    codeMustNotMatch: [
      "inviteUrl\\s*=\\s*partnerCode[\\s\\S]*:\\s*`\\$\\{SITE_URL\\}/shadow-score`",
    ],
  },

  // ---------------------------------------------------------------------------
  // __tests__/layout/app-sidebar.test.tsx (source-grep it only)
  // ---------------------------------------------------------------------------
  {
    id: "app-sidebar/source-locks",
    file: "components/layout/AppHeader.tsx",
    identifiersMustNot: [
      "JOURNEY_ORDER",
      "SidebarPulseStrip",
      "SidebarScoreChip",
      "footerChipModel",
      "SidebarShellCompass",
      "NotificationBell",
    ],
    stringsMust: [
      "data-app-shell",
      "data-shell-compass",
      "data-shell-assess",
      "data-shell-more",
    ],
    stringsMustNot: [
      "Jump to",
      '"/dashboard": Compass',
      '"/plan": Compass',
      '"/dashboard": Home',
      "Build entry (Home)",
      "Pulse·7d",
      "DO NOT PROCEED",
    ],
    importsMust: ["@/components/brand/ThresholdCompass"],
    importsMustNot: ["@/components/finance/ThresholdCompass"],
    codeMust: ["glow={false}", "animated={false}", "size={SHELL_COMPASS_SIZE}"],
    codeMustNot: ["Held ${"],
    codeMustNotMatch: ["^\\s*Compass,", "lucide-compass"],
  },
  {
    id: "app-sidebar/brand-compass-glow-filter-respects-prop",
    file: "components/brand/ThresholdCompass.tsx",
    codeMust: [
      'viewBox="0 0 200 200"',
      'r="85"',
      'r="60"',
      'r="35"',
      'glow ? "url(#hc-glow)" : undefined',
    ],
    stringsMustNot: ['filter="url(#hc-glow)"'],
  },
  {
    id: "app-sidebar/pulse-strip-retired",
    file: "components/layout/SidebarDecisionState.tsx",
    identifiersMustNot: ["footerChipModel"],
    stringsMustNot: ["sidebar-pulse-strip"],
    codeMustNot: [
      "function SidebarPulseStrip",
      "export function SidebarDecisionState",
      'label: "Pulse',
    ],
  },
  {
    id: "app-sidebar/bottom-nav-labels",
    file: "components/layout/ProductBottomNav.tsx",
    codeMust: ['label: "HōMI"', 'label: "Assess"'],
    codeMustNotMatch: ['label: "Home"', 'label: "Money"'],
  },

  // ---------------------------------------------------------------------------
  // __tests__/layout/money-mode-nav.test.ts (source-grep its only)
  // ---------------------------------------------------------------------------
  {
    id: "money-mode-nav/bottom-nav-not-cockpit",
    file: "components/layout/ProductBottomNav.tsx",
    identifiersMustNot: ["MONEY_MODES", "MoneyModeNav"],
    codeMust: [
      "lg:hidden",
      "env(safe-area-inset-bottom",
      'aria-current={isActive ? "page" : undefined}',
      'label: "HōMI"',
      'label: "Assess"',
    ],
  },
  {
    id: "money-mode-nav/bottom-nav-on-product-router",
    file: "components/layout/ProductLayoutRouter.tsx",
    identifiersMust: ["AppHeader"],
    identifiersMustNot: ["ProductBottomNav", "AppSidebar"],
  },
  {
    id: "money-mode-nav/bottom-nav-off-product-layout",
    file: "app/(product)/layout.tsx",
    identifiersMustNot: ["ProductBottomNav"],
  },
  {
    id: "money-mode-nav/companion-fab-clears-bar-host",
    file: "components/companion/CompanionHost.tsx",
    codeMust: ['bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))]'],
    codeMustNot: ["max-lg:bottom-"],
  },
  {
    id: "money-mode-nav/companion-fab-clears-bar-widget",
    file: "components/companion/CompanionWidget.tsx",
    codeMust: ['bottom-[max(1.5rem,env(safe-area-inset-bottom,0px))]'],
    codeMustNot: ["max-lg:bottom-"],
  },

  // ---------------------------------------------------------------------------
  // __tests__/layout/product-bottom-nav.test.tsx (source-grep it only)
  // ---------------------------------------------------------------------------
  {
    id: "product-bottom-nav/source-no-money-cockpit",
    file: "components/layout/ProductBottomNav.tsx",
    identifiersMustNot: ["MONEY_MODES", "MoneyModeNav"],
    stringsMustNot: ["/money", "/advisor", "Reality", "Decide", "Goals"],
    codeMust: ['label: "HōMI"', 'label: "Assess"', "lg:hidden"],
    codeMustNotMatch: [
      'label: "Home"',
      'label: "Money"',
      'label: "Readiness"',
    ],
  },

  // ---------------------------------------------------------------------------
  // __tests__/marketing/chrome-honesty.test.ts
  // ---------------------------------------------------------------------------
  {
    id: "chrome-honesty/pricing-free-brand-use",
    file: "app/(marketing)/pricing/page.tsx",
    stringsMust: ["Protective verdict and Path — same quality as paid."],
  },
  {
    id: "chrome-honesty/stripe-plus-companion-voice",
    file: "lib/stripe/tiers.ts",
    stringsMust: [
      "Verdict in your companion's voice (Steady, Clarity, or Horizon).",
    ],
  },
  {
    id: "chrome-honesty/companion-tier-copy-brand-use",
    file: "lib/advisor/companion-tier-copy.ts",
    stringsMust: [
      "Rule-based notes on this verdict.",
      "Ask about this verdict.",
    ],
  },
  {
    id: "chrome-honesty/pricing-no-rehearse-genome",
    file: "app/(marketing)/pricing/page.tsx",
    stringsMust: ["Higher daily ask-about-this-verdict limits."],
    // Original: /rehearse/i and /genome/i on the joined pro blob.
    codeMustNotMatch: ["rehearse", "genome"],
  },
  {
    id: "chrome-honesty/tiers-no-rehearse-genome",
    file: "lib/stripe/tiers.ts",
    codeMustNotMatch: ["rehearse", "genome"],
  },
  ...CHROME_HONESTY_SKU_SURFACES.map(
    (file): SourceLockFact => ({
      id: `chrome-honesty/no-companion-sku-or-shadow/${file}`,
      file,
      stringsMustNot: [...SKU_BANNED, ...SHADOW_BANNED],
    }),
  ),
  {
    id: "chrome-honesty/pricing-no-sold-lies",
    file: "app/(marketing)/pricing/page.tsx",
    stringsMustNot: [...SOLD_LIES],
    codeMustNot: ['href="/partner"'],
    codeMustNotMatch: ["Trinity|Twin"],
  },
  {
    id: "chrome-honesty/tiers-no-sold-lies",
    file: "lib/stripe/tiers.ts",
    stringsMustNot: [...SOLD_LIES],
    codeMustNotMatch: ["Trinity|Twin"],
  },
  {
    id: "chrome-honesty/pricing-primary-close",
    file: "app/(marketing)/pricing/page.tsx",
    identifiersMust: ["PRIMARY_CLOSE_HREF", "PRIMARY_CLOSE_LABEL"],
    codeMustNot: ['href="/shadow-score"'],
  },
  {
    id: "chrome-honesty/how-it-works-primary-close",
    file: "app/(marketing)/how-it-works/page.tsx",
    identifiersMust: ["PRIMARY_CLOSE_HREF", "PRIMARY_CLOSE_LABEL"],
    stringsMustNot: ["Get your score — 90 seconds", "Get your score"],
    codeMustNot: ['href="/shadow-score"'],
  },
  {
    id: "chrome-honesty/how-it-works-product-weights",
    file: "app/(marketing)/how-it-works/page.tsx",
    stringsMust: [
      "Three pillars, weighed differently — how they combine stays ours. No single pillar",
      "Not yet is a starting line, not a wall. You get a map: the specific, ordered things to build first.",
      "Your answers become a deterministic readiness score — same inputs, same answer, every time. Then hard-stops: conditions that override the math because they are not safe to build on top of.",
      "How the pillars weigh in stays ours. Here is what each pillar looks at and why it",
    ],
    stringsMustNot: [
      "HōMI weighs all three pillars equally",
      "equally-weighted",
      "equal weights",
      "weights are a trade secret",
      "those are the trade secret",
      "shadow version",
      "200+ signals",
      "Every verdict below READY comes with a map",
      "HōMI weighs Financial Reality, Emotional Truth, and Perfect Timing at 35 / 35 / 30, then checks for hard-stops — conditions that override the math entirely because they are not safe to build on top of.",
      "The public weights are 35 / 35 / 30 — Financial Reality, Emotional Truth, Perfect Timing. Here is what each pillar looks at and why it matters.",
      "Three pillars, not equal. Financial Reality 35. Emotional Truth 35. Perfect Timing 30.",
    ],
  },
  {
    id: "chrome-honesty/homepage-no-fake-score-numerals",
    file: "app/(marketing)/page.tsx",
    codeMustNotMatch: [
      "score-numeral[^>]*>\\s*76\\s*<",
      "score-numeral[^>]*>\\s*52\\s*<",
    ],
  },
  {
    id: "chrome-honesty/homepage-temperature-only",
    file: "app/(marketing)/page.tsx",
    stringsMustNot: [...VERDICT_BADGES, ...FAKE_SCORE_RANGES, "READY"],
    codeMustNot: ['verdict="READY"'],
  },
  {
    id: "chrome-honesty/homepage-no-sample-path-law",
    file: "app/(marketing)/page.tsx",
    stringsMustNot: ["Sample path", "28 / 33 / 36"],
    // Original: /credit score above 700/i and /above 700/ /below 36%/
    codeMustNotMatch: ["credit score above 700", "above 700", "below 36%"],
  },
  {
    id: "chrome-honesty/broker-panel-no-snaptrade-mx",
    file: "components/planner/wealth/BrokerPanel.tsx",
    // Original: /SnapTrade/i and /\bMX\b/
    codeMustNotMatch: ["SnapTrade", "\\bMX\\b"],
  },

  // ---------------------------------------------------------------------------
  // __tests__/marketing/cookies-policy.test.ts
  // ---------------------------------------------------------------------------
  {
    id: "cookies-policy/page-admits-posthog",
    file: "app/(marketing)/legal/cookies/page.tsx",
    stringsMust: [
      "PostHog",
      "Optional",
      "optional analytics",
      "Last updated: 20 Aug 2026",
    ],
    codeMust: ['href="/legal/subprocessors"'],
  },
  {
    id: "cookies-policy/banner-matches-code",
    file: "components/consent/CookieConsent.tsx",
    stringsMust: [
      "essential cookies to keep you signed in",
      "Optional analytics",
      "No ad tech",
    ],
  },
  {
    id: "cookies-policy/page-matches-banner",
    file: "app/(marketing)/legal/cookies/page.tsx",
    stringsMust: [
      "essential cookies to keep you signed in",
      "Optional analytics help",
      "No ad tech",
      "Supabase auth session cookie",
      "memory-only",
      "Session recording is off",
    ],
  },
  {
    id: "cookies-policy/csp-allowlists",
    file: "next.config.ts",
    stringsMust: [
      "https://*.posthog.com",
      "https://*.supabase.co",
      "https://cdn.plaid.com",
    ],
  },
  {
    id: "cookies-policy/analytics-memory-only",
    file: "components/analytics/AnalyticsScripts.tsx",
    codeMust: ['persistence:"memory"', "disable_session_recording:true"],
  },
  {
    id: "cookies-policy/consent-key",
    file: "components/consent/consent-shared.ts",
    codeMust: ['CONSENT_KEY = "homi:consent"'],
  },
  {
    id: "cookies-policy/attribution-cookie",
    file: "lib/attribution.ts",
    codeMust: ['ATTRIBUTION_COOKIE = "homi_attr"'],
  },
  {
    id: "cookies-policy/page-names-flags",
    file: "app/(marketing)/legal/cookies/page.tsx",
    stringsMust: ["homi:consent", "homi_attr"],
  },
  {
    id: "cookies-policy/banner-no-gpc",
    file: "components/consent/CookieConsent.tsx",
    // Original: /globalPrivacyControl|GPC|doNotTrack/i
    codeMustNotMatch: ["globalPrivacyControl|GPC|doNotTrack"],
  },
  {
    id: "cookies-policy/page-no-gpc-no-ad-tech-programs",
    file: "app/(marketing)/legal/cookies/page.tsx",
    stringsMust: [
      "We do not respond to Global Privacy Control",
      "We do not run Google Analytics, FullStory, Meta Pixel",
      "Network Advertising Initiative",
      "Digital Advertising Alliance",
    ],
    codeMustNotMatch: ["\\[INSERT|\\[ADD|\\[EMAIL|\\[DATE"],
  },
  {
    id: "cookies-policy/no-killed-tracker-denial",
    file: "app/(marketing)/legal/cookies/page.tsx",
    stringsMustNot: [
      "zero trackers",
      "Zero trackers, zero ad tech",
      "That is the whole list",
      "analytics trackers",
      "essential only, zero trackers",
      "anonymous visitors use it before creating an account",
      "most recent Shadow Score or full-assessment result, saved locally so /results and /plan work without an account",
    ],
  },
  {
    id: "cookies-policy/metadata",
    file: "app/(marketing)/legal/cookies/page.tsx",
    stringsMust: [
      "How HōMI uses essential cookies and optional analytics. No ad tech. You can reject optional analytics anytime.",
    ],
    codeMust: ['title: "Cookie Policy"', 'path: "/legal/cookies"'],
  },

  // ---------------------------------------------------------------------------
  // __tests__/marketing/decision-os-positioning.test.ts
  // ---------------------------------------------------------------------------
  {
    id: "decision-os/home-mount-order",
    file: "app/(marketing)/page.tsx",
    codeMust: ["<DecisionOS />"],
    codeMustMatch: [
      "<Steps />[\\s\\S]*<DecisionOS />",
      "<DecisionOS />[\\s\\S]*<Clarity />",
    ],
  },
  {
    id: "decision-os/front-door-story",
    file: "components/home/FrontDoor.tsx",
    stringsMust: [
      "Decision Readiness Intelligence™",
      "Decision Readiness Score",
    ],
    stringsMustNot: ["Decision Intelligence OS", "/scanner", "/command-center"],
    codeMust: [
      'data-decision-os=""',
      'href: "/assessment"',
      'href: "/tools"',
      'href: "/how-it-works"',
      'href: "/dashboard"',
      'href="/b2b"',
    ],
  },
  {
    id: "decision-os/front-door-no-homi-score",
    file: "components/home/FrontDoor.tsx",
    stringsMustNot: ["HōMI Score"],
  },
  {
    id: "decision-os/b2b-no-homi-score",
    file: "app/(marketing)/b2b/page.tsx",
    stringsMustNot: ["HōMI Score"],
  },
  {
    id: "decision-os/b2b-delivery-models",
    file: "app/(marketing)/b2b/page.tsx",
    stringsMust: [
      "Employers",
      "Partners",
      "Developers + agents",
      "aggregate",
    ],
    codeMust: ['data-b2b2c-model=""', 'href="/architecture.json"'],
  },

  // ---------------------------------------------------------------------------
  // __tests__/marketing/homepage-walk.test.ts (src() greps only)
  // ---------------------------------------------------------------------------
  {
    id: "homepage-walk/hero-locked-line-idents",
    file: "components/home/InterviewHero.tsx",
    identifiersMust: ["WALK_QUESTION", "WALK_INVERSION"],
    identifiersMustNot: ["WALK_OBJECT"],
  },
  {
    id: "homepage-walk/home-mounts-front-door",
    file: "app/(marketing)/page.tsx",
    identifiersMust: [
      "softwareApplicationJsonLd",
      "organizationJsonLd",
      "websiteJsonLd",
    ],
    identifiersMustNot: ["WALK_INVERSION"],
    importsMust: ["@/components/home/FrontDoor"],
    stringsMustNot: [...FIRST_MOMENT_BEAT_LINES],
  },
  {
    id: "homepage-walk/front-door-locked-lines",
    file: "components/home/FrontDoor.tsx",
    identifiersMust: [
      "WALK_COMPANION",
      "WALK_PRIMARY",
      "WALK_CLARITY",
      "WALK_OBJECT",
    ],
    stringsMust: ["Not yet is not"],
    stringsMustNot: [...FIRST_MOMENT_BEAT_LINES],
    codeMust: ['className="text-emerald"'],
  },
  {
    id: "homepage-walk/hero-no-first-moment-beats",
    file: "components/home/InterviewHero.tsx",
    stringsMustNot: [...FIRST_MOMENT_BEAT_LINES],
  },
  {
    id: "homepage-walk/hero-h1-first-viewport",
    file: "components/home/InterviewHero.tsx",
    // Original also asserts exactly one `<h1[\s>]` match.
    stringsMust: ["type-giant", "text-ink"],
    stringsMustNot: ["opacity-0"],
    codeMust: ["<h1", "{WALK_QUESTION}", 'textWrap: "balance"', "opacity: 1"],
    codeMustNot: ["opacity: 0"],
    // Original: /typewriter|split-type|SplitType/i
    codeMustNotMatch: ["typewriter|split-type|SplitType"],
  },
  {
    id: "homepage-walk/hero-inversion-readable",
    file: "components/home/InterviewHero.tsx",
    stringsMust: ["type-h2"],
    codeMust: ["{WALK_INVERSION}"],
    // Original: the 220 chars *before* `{WALK_INVERSION}` contain both tokens.
    codeMustMatch: [
      "opacity: 1[\\s\\S]{0,220}\\{WALK_INVERSION\\}",
      'textWrap: "balance"[\\s\\S]{0,220}\\{WALK_INVERSION\\}',
    ],
  },
  {
    id: "homepage-walk/hero-no-100vh-walk",
    file: "components/home/InterviewHero.tsx",
    stringsMustNot: ["h-[100dvh]"],
  },
  {
    id: "homepage-walk/home-no-walk-theater",
    file: "app/(marketing)/page.tsx",
    stringsMustNot: ["walk-when"],
    codeMustNot: ['href="/walk"'],
  },
  {
    id: "homepage-walk/home-live-modules",
    file: "app/(marketing)/page.tsx",
    // Original: the set of `@/components/home/*` specifiers is exactly these three.
    importsMust: [
      "@/components/home/FrontDoor",
      "@/components/home/InterviewHero",
      "@/components/home/PaperScene",
    ],
  },
  {
    id: "homepage-walk/hero-live-modules",
    file: "components/home/InterviewHero.tsx",
    // Original: the set of `./` specifiers is exactly Compass3D + walk-copy.
    importsMust: ["./Compass3D", "./walk-copy"],
  },
  {
    id: "homepage-walk/hero-assess-under-h1",
    file: "components/home/InterviewHero.tsx",
    identifiersMust: ["PRIMARY_CLOSE_HREF", "PRIMARY_CLOSE_LABEL_HOME"],
    stringsMustNot: ["walk-travel-assess", "object-hero"],
    codeMust: [
      "?src=hero",
      'track("hero_cta_click", { src: "hero" })',
      "btn-primary",
    ],
    // Original: exactly one `btn-primary` match; /lg:grid-cols/ banned.
    codeMustNotMatch: ["lg:grid-cols"],
  },
  {
    id: "homepage-walk/home-no-primary-close",
    file: "app/(marketing)/page.tsx",
    identifiersMustNot: ["PRIMARY_CLOSE"],
    stringsMustNot: ["btn-primary", "walk-travel-assess"],
  },
  {
    id: "homepage-walk/hero-brand-compass",
    file: "components/home/InterviewHero.tsx",
    identifiersMust: ["Compass3D"],
    identifiersMustNot: ["COMPASS_FIELD", "Particles", "WALK_OBJECT"],
    stringsMust: ["data-hero-compass", "md:w-[min(68vmin,38rem)]"],
    stringsMustNot: [
      "9.25rem",
      "26vmin",
      "hero-instrument-field",
    ],
    codeMust: ["keyholePulse={false}"],
    codeMustNot: ['verdict="READY"', "{WALK_OBJECT}"],
  },
  {
    id: "homepage-walk/home-no-particles-or-cinematic",
    file: "app/(marketing)/page.tsx",
    identifiersMustNot: ["Particles", "CinematicCompass", "Compass3D"],
  },
  {
    id: "homepage-walk/cinematic-compass-radii",
    file: "components/home/CinematicCompass.tsx",
    codeMust: ['r="85"', 'r="60"', 'r="35"'],
  },
  {
    id: "homepage-walk/front-door-document-type",
    file: "components/home/FrontDoor.tsx",
    stringsMust: ["type-display"],
  },
  {
    id: "homepage-walk/home-no-100vh",
    file: "app/(marketing)/page.tsx",
    stringsMustNot: ["h-[100dvh]"],
  },
  ...HOMEPAGE_SCROLL_SURFACES.map(
    (file): SourceLockFact => ({
      id: `homepage-walk/native-scroll-only/${file}`,
      file,
      identifiersMustNot: ["preventDefault"],
      stringsMustNot: ['addEventListener("scroll"'],
      importsMustNot: ["gsap", "lenis", "split-type", "@studio-freight/lenis"],
      codeMustNotMatch: [
        "scroll-snap|scrollSnap|pin-spacer|pinSpacer",
        'from\\s+["\'](?:gsap|lenis|split-type|@studio-freight\\/lenis)["\']',
      ],
    }),
  ),
  {
    id: "homepage-walk/home-no-parked-theater",
    file: "app/(marketing)/page.tsx",
    stringsMustNot: [
      "/advisor",
      "Packet 2",
      "HōMI Score",
      "4:3:2",
      "85/60/35",
    ],
    codeMustNot: ["<table"],
  },
  {
    id: "homepage-walk/hero-no-ratio-theater",
    file: "components/home/InterviewHero.tsx",
    stringsMustNot: ["4:3:2", "85/60/35"],
  },
  {
    id: "homepage-walk/home-no-terafab",
    file: "app/(marketing)/page.tsx",
    stringsMustNot: [
      "tf-page",
      "tf-guides",
      "tf-panel",
      "Watch Now",
      "Kardashev",
      "Inter Tight",
      "object-hero",
      "object-key",
      "Trinity",
      "70 · told to wait",
    ],
    // Original: /Geist|SF Pro|Inter Tight/
    codeMustNotMatch: ["Geist|SF Pro|Inter Tight"],
  },
  {
    id: "homepage-walk/hero-no-terafab",
    file: "components/home/InterviewHero.tsx",
    stringsMustNot: [
      "tf-kicker",
      "What this is",
      "font-light",
      "Trinity",
      "70 · told to wait",
    ],
    codeMustNotMatch: ["Geist|SF Pro|Inter Tight"],
  },
  {
    id: "homepage-walk/cookie-copy-locked",
    file: "components/consent/CookieConsent.tsx",
    stringsMust: [
      "HōMI uses essential cookies to keep you signed in. Optional analytics help us improve the",
      "product — your choice, and you can change it anytime. No ad tech.",
      "Reject optional",
      "Accept optional",
      "Cookie policy",
    ],
  },
  {
    id: "homepage-walk/cookie-hairline",
    file: "components/consent/CookieConsent.tsx",
    codeMust: ["border-t border-white/[0.06]"],
  },
  {
    id: "homepage-walk/cookie-accept-filled-reject-text",
    file: "components/consent/CookieConsent.tsx",
    stringsMust: ["cookie-reject"],
    codeMustMatch: [
      "Accept optional[\\s\\S]{0,80}btn-primary|btn-primary[\\s\\S]{0,120}Accept optional",
    ],
    codeMustNotMatch: [
      "btn-primary[\\s\\S]{0,180}Reject optional",
      "btn-ghost[\\s\\S]{0,180}Reject optional",
    ],
  },
  {
    id: "homepage-walk/header-shell-hamburger",
    file: "components/layout/HeaderShell.tsx",
    codeMust: ['className="ml-auto lg:hidden"'],
    codeMustNot: ["chrome-icon-btn ml-auto lg:ml-0 lg:hidden"],
  },
  {
    id: "homepage-walk/site-header-slim-nav",
    file: "components/layout/SiteHeader.tsx",
    identifiersMust: ["slimHome", "PRIMARY_CLOSE_HREF", "PRIMARY_CLOSE_LABEL"],
    stringsMust: [
      "How It Works",
      "Assessment",
      "Guides",
      "Pricing",
      "For Teams",
      "Sign in",
    ],
    codeMust: ['pathname === "/"'],
    // Original: the NAV block between `const NAV` and `] as const` has exactly 5 `label:` matches.
  },
  {
    id: "homepage-walk/waitlist-form-keeps-get-notified",
    file: "components/marketing/WaitlistForm.tsx",
    stringsMust: ["Get notified"],
  },
  {
    id: "homepage-walk/home-no-waitlist-capture",
    file: "app/(marketing)/page.tsx",
    identifiersMustNot: ["WaitlistForm", "PRIMARY_CLOSE"],
    stringsMustNot: [
      "Get notified",
      "Packet 2",
      "Rehearse",
      "HōMI Companion",
      "vendor list",
    ],
    codeMustNot: [
      'source="landing"',
      'idPrefix="landing-waitlist"',
      'surface="whisper"',
      'id="waitlist"',
    ],
  },
  {
    id: "homepage-walk/hero-is-only-homepage-close",
    file: "components/home/InterviewHero.tsx",
    identifiersMust: ["PRIMARY_CLOSE_HREF", "PRIMARY_CLOSE_LABEL_HOME"],
  },
  {
    id: "homepage-walk/quiet-footer-disclaimer",
    file: "components/layout/QuietHomeFooter.tsx",
    stringsMust: [
      "bg-navy",
      "HōMI provides educational guidance only. Consider consulting qualified professionals before making legal, tax, mortgage, investment, or real estate decisions.",
    ],
    stringsMustNot: [
      "Educational only — not financial advice.",
      "LEGAL_DISCLAIMER",
      "Decision Readiness Intelligence",
    ],
  },

  // ---------------------------------------------------------------------------
  // __tests__/marketing/how-it-works.test.ts
  // ---------------------------------------------------------------------------
  {
    id: "how-it-works/brand-authored-lock",
    file: "app/(marketing)/how-it-works/page.tsx",
    identifiersMust: ["PRIMARY_CLOSE_HREF", "PRIMARY_CLOSE_LABEL"],
    stringsMust: [
      "Three pillars, weighed differently — how they combine stays ours. No single pillar",
      "Answer honest questions across Financial Reality, Emotional Truth, and Perfect Timing. Sliders, not essays.",
      "Your answers become a deterministic readiness score — same inputs, same answer, every time. Then hard-stops: conditions that override the math because they are not safe to build on top of.",
      "How the pillars weigh in stays ours. Here is what each pillar looks at and why it",
      "Not yet is a starting line, not a wall. You get a map: the specific, ordered things to build first.",
      "The Decision Readiness Score is not a credit score.",
      "Lenders will still pull a credit report.",
      "Their",
      "gates are their gates, not a HōMI verdict.",
    ],
    stringsMustNot: [
      ...HOW_IT_WORKS_KILLED,
      "those are the trade secret",
      "We don’t publish exact point values or weights",
      "We don&rsquo;t publish exact point values or weights",
      "Get your score",
      "replace your credit score",
      "HōMI-approved",
      "UltraFICO",
      "Trinity",
      "Homie",
      "Advisor",
      "Packet 2",
    ],
    codeMustNot: ['href="/shadow-score"', 'href="/assessment"'],
    // Original: /weighs all three pillars equally/i and /Cody Short|founder/i
    codeMustNotMatch: [
      "weighs all three pillars equally",
      "Cody Short|founder",
    ],
  },

  // ---------------------------------------------------------------------------
  // __tests__/marketing/legal-pages.test.ts
  // ---------------------------------------------------------------------------
  ...LEGAL_DATED_PAGES.map(
    (file): SourceLockFact => ({
      id: `legal-pages/dated-20-aug-2026/${file}`,
      file,
      stringsMust: ["Last updated: 20 Aug 2026"],
    }),
  ),
  {
    id: "legal-pages/privacy-metadata",
    file: "app/(marketing)/legal/privacy/page.tsx",
    codeMust: ['title: "Privacy Policy"', 'path: "/legal/privacy"'],
  },
  {
    id: "legal-pages/cookies-metadata",
    file: "app/(marketing)/legal/cookies/page.tsx",
    codeMust: ['title: "Cookie Policy"', 'path: "/legal/cookies"'],
  },
  {
    id: "legal-pages/terms-metadata",
    file: "app/(marketing)/legal/terms/page.tsx",
    codeMust: ['title: "Terms of Service"', 'path: "/legal/terms"'],
  },
  {
    id: "legal-pages/privacy-entity",
    file: "app/(marketing)/legal/privacy/page.tsx",
    stringsMust: [
      "Homi Technologies LLC",
      "651 N Broad St, Suite 201",
      "Middletown, DE 19709",
      "homitechnology.com",
      "hello@homitechnology.com",
      "security@homitechnology.com",
      "Info@homitechnology.com",
    ],
    stringsMustNot: ["Floweva", "Palm Springs"],
    codeMustMatch: ["We do not have a telephone number|No telephone"],
    codeMustNotMatch: ["tel:", "\\+1[-\\s(]"],
  },
  {
    id: "legal-pages/terms-entity",
    file: "app/(marketing)/legal/terms/page.tsx",
    stringsMust: [
      "651 N Broad St, Suite 201",
      "Middletown, DE 19709",
      "hello@homitechnology.com",
      "Info@homitechnology.com",
    ],
    stringsMustNot: ["Floweva", "Palm Springs"],
    codeMustMatch: ["We do not have a telephone number|No telephone"],
    codeMustNotMatch: ["tel:", "\\+1[-\\s(]"],
  },
  {
    id: "legal-pages/cookies-no-phone",
    file: "app/(marketing)/legal/cookies/page.tsx",
    codeMustMatch: ["We do not have a telephone number|No telephone"],
    codeMustNotMatch: ["tel:", "\\+1[-\\s(]"],
  },
  {
    id: "legal-pages/subprocessors-live-vendors",
    file: "app/(marketing)/legal/subprocessors/page.tsx",
    stringsMust: [...LEGAL_LIVE_VENDORS],
  },
  {
    id: "legal-pages/privacy-live-vendors",
    file: "app/(marketing)/legal/privacy/page.tsx",
    stringsMust: [
      ...LEGAL_LIVE_VENDORS,
      "We do not use MX, SnapTrade, Meta Pixel",
      "Google Analytics, or FullStory",
    ],
  },
  {
    id: "legal-pages/privacy-us-only",
    file: "app/(marketing)/legal/privacy/page.tsx",
    stringsMust: [
      "United States privacy notice",
      "We do not claim GDPR operations",
      "standard contractual clauses",
    ],
    codeMustMatch: [
      "data-protection\\s+officer",
      "EEA or UK\\s+establishment",
    ],
    codeMustNotMatch: ["\\bDPO\\b"],
  },
  {
    id: "legal-pages/privacy-no-sale-no-gpc",
    file: "app/(marketing)/legal/privacy/page.tsx",
    stringsMust: [
      "We do not sell personal information",
      "does not read Global Privacy Control",
    ],
    stringsMustNot: ["We honor GPC"],
    codeMustMatch: [
      "do not share personal information for\\s+targeted advertising",
    ],
  },
  {
    id: "legal-pages/cookies-no-gpc-honor",
    file: "app/(marketing)/legal/cookies/page.tsx",
    stringsMust: ["We do not respond to Global Privacy Control"],
    stringsMustNot: ["We honor GPC"],
  },
  {
    id: "legal-pages/terms-florida-venue",
    file: "app/(marketing)/legal/terms/page.tsx",
    stringsMust: [
      "State of Florida",
      "courts located in Florida",
      "We do not require arbitration",
      "California resident",
    ],
    stringsMustNot: ["JAMS", "DecisionLayer", "30 days to opt out"],
    codeMustNotMatch: ["laws of the State of California"],
  },
  {
    id: "legal-pages/privacy-cross-links",
    file: "app/(marketing)/legal/privacy/page.tsx",
    codeMust: ['href="/legal/disclaimer"', 'href="/legal/subprocessors"'],
  },
  {
    id: "legal-pages/terms-cross-links",
    file: "app/(marketing)/legal/terms/page.tsx",
    codeMust: [
      'href="/legal/disclaimer"',
      'href="/legal/acceptable-use"',
      'href="/legal/dmca"',
      'href="/legal/subprocessors"',
    ],
  },
  {
    id: "legal-pages/cookies-cross-links",
    file: "app/(marketing)/legal/cookies/page.tsx",
    codeMust: ['href="/legal/subprocessors"', 'href="/legal/privacy"'],
  },
  ...LEGAL_DATED_PAGES.map(
    (file): SourceLockFact => ({
      id: `legal-pages/no-scoring-internals-or-placeholders/${file}`,
      file,
      codeMustNotMatch: [
        "\\b35%\\b",
        "\\bREADY ≥",
        "\\[CompanyName\\]|\\[INSERT|\\[ADD\\]|\\[DATE\\]|\\[EMAIL\\]",
        "General Legal|legal-templates",
      ],
    }),
  ),
  {
    id: "legal-pages/privacy-educational-only",
    file: "app/(marketing)/legal/privacy/page.tsx",
    stringsMust: ["educational only"],
  },
  {
    id: "legal-pages/terms-educational-only",
    file: "app/(marketing)/legal/terms/page.tsx",
    stringsMust: [
      "educational only",
      "not a lender",
      "not a registered investment advisor",
      "not a credit bureau",
      "score is not advice",
    ],
  },

  // ---------------------------------------------------------------------------
  // __tests__/marketing/primary-close.test.ts
  // ---------------------------------------------------------------------------
  {
    id: "primary-close/site-header-assess",
    file: "components/layout/SiteHeader.tsx",
    identifiersMust: ["PRIMARY_CLOSE_HREF", "PRIMARY_CLOSE_LABEL"],
    stringsMustNot: ["Get your score"],
    codeMustNot: ['href="/shadow-score"'],
  },
  {
    id: "primary-close/site-header-assessment-nav",
    file: "components/layout/SiteHeader.tsx",
    codeMustMatch: ['href:\\s*PRIMARY_CLOSE_HREF,\\s*label:\\s*"Assessment"'],
    codeMustNotMatch: ['href:\\s*["\']/assessment["\']'],
  },
  {
    id: "primary-close/site-header-slim-home-sign-in",
    file: "components/layout/SiteHeader.tsx",
    identifiersMust: ["slimHome"],
    stringsMust: ["Sign in"],
    codeMust: ['pathname === "/"', "/auth/sign-in"],
  },
  {
    id: "primary-close/interview-hero-assess",
    file: "components/home/InterviewHero.tsx",
    identifiersMust: ["PRIMARY_CLOSE_HREF", "PRIMARY_CLOSE_LABEL_HOME"],
    stringsMustNot: ["/shadow-score", "Check My Readiness"],
  },
  {
    id: "primary-close/interview-hero-no-unstored-claim",
    file: "components/home/InterviewHero.tsx",
    stringsMustNot: ["aren't stored", "aren&rsquo;t stored"],
    // Original: /aren.?t stored or sent/i
    codeMustNotMatch: ["aren.?t stored or sent"],
  },
  {
    id: "primary-close/interview-hero-first-viewport",
    file: "components/home/InterviewHero.tsx",
    identifiersMust: [
      "WALK_QUESTION",
      "WALK_INVERSION",
      "PRIMARY_CLOSE_HREF",
    ],
    stringsMustNot: ["walk-travel-assess"],
    codeMust: ['track("hero_cta_click", { src: "hero" })', "?src=hero"],
  },
  {
    id: "primary-close/interview-hero-no-theater-split",
    file: "components/home/InterviewHero.tsx",
    stringsMustNot: [
      "70 · told to wait",
      "Trinity",
      "If you lost your income tomorrow",
    ],
    codeMustNotMatch: ["lg:grid-cols"],
  },
  ...PRIMARY_CLOSE_LABEL_SURFACES.map(
    (file): SourceLockFact => ({
      id: `primary-close/banned-labels/${file}`,
      file,
      stringsMustNot: [...BANNED_PRIMARY_LABELS],
    }),
  ),
  {
    id: "primary-close/how-it-works-assess",
    file: "app/(marketing)/how-it-works/page.tsx",
    identifiersMust: ["PRIMARY_CLOSE_HREF", "PRIMARY_CLOSE_LABEL"],
    stringsMustNot: ["Get your score"],
    codeMustNot: ['href="/shadow-score"'],
  },
  {
    id: "primary-close/onboarding-assess-only",
    file: "app/(product)/onboarding/page.tsx",
    stringsMustNot: ["Shadow Score"],
    codeMust: ['href="/assessment"'],
    codeMustNot: ['href="/shadow-score"'],
  },
  {
    id: "primary-close/first-moment-handoff",
    file: "app/(marketing)/first-moment/page.tsx",
    identifiersMust: ["SIGNED_IN_ASSESS_HREF", "FirstMoment"],
    stringsMustNot: ["/shadow-score", "/results"],
  },

  // ---------------------------------------------------------------------------
  // __tests__/marketing/quiet-home-footer.test.ts
  // ---------------------------------------------------------------------------
  {
    id: "quiet-home-footer/site-footer-always-quiet",
    file: "components/layout/SiteFooter.tsx",
    identifiersMustNot: ["SiteFooterSwitch", "usePathname"],
    importsMustNot: ["@/components/layout/SitemapFooter"],
    codeMust: ["<QuietHomeFooter"],
    codeMustNot: ["<SitemapFooter", 'pathname === "/"'],
  },
  ...SITE_FOOTER_MOUNTS.map(
    (file): SourceLockFact => ({
      id: `quiet-home-footer/mounts-site-footer/${file}`,
      file,
      identifiersMustNot: ["SitemapFooter"],
      codeMust: ["<SiteFooter"],
    }),
  ),
  {
    id: "quiet-home-footer/legal-row",
    file: "components/layout/QuietHomeFooter.tsx",
    codeMust: [
      '{ href: "/legal/privacy", label: "Privacy" }',
      '{ href: "/legal/terms", label: "Terms" }',
      '{ href: "/legal/cookies", label: "Cookies" }',
      '{ href: "mailto:support@homitechnology.com", label: "Support" }',
      '{ href: "/waitlist", label: "Waitlist" }',
    ],
    codeMustMatch: [
      'label: "Privacy"[\\s\\S]*label: "Terms"[\\s\\S]*label: "Cookies"[\\s\\S]*label: "Support"[\\s\\S]*href: "/waitlist", label: "Waitlist"',
    ],
  },
  {
    id: "quiet-home-footer/socials",
    file: "components/layout/QuietHomeFooter.tsx",
    stringsMust: [
      "https://www.tiktok.com/@homi_technology",
      "https://x.com/homi_tech",
    ],
    codeMust: [
      'aria-label="HōMI on X (opens in a new tab)"',
      'aria-label="HōMI on TikTok (opens in a new tab)"',
      'target="_blank"',
      'rel="noopener noreferrer"',
    ],
    codeMustMatch: [">\\s*X\\s*<", ">\\s*TikTok\\s*<"],
  },
  {
    id: "quiet-home-footer/waitlist-text-link-only",
    file: "components/layout/QuietHomeFooter.tsx",
    identifiersMustNot: ["WaitlistForm", "PRIMARY_CLOSE"],
    stringsMustNot: [
      "Get notified",
      "Packet 2",
      "Rehearse",
      "HōMI Companion",
      "vendor list",
      "subprocessors",
      "SnapTrade",
    ],
    codeMust: ['{ href: "/waitlist", label: "Waitlist" }'],
    // Original: exactly one `label: "Waitlist"` match.
  },
  {
    id: "quiet-home-footer/site-footer-forbids-sitemap-wall",
    file: "components/layout/SiteFooter.tsx",
    identifiersMustNot: ["LEGAL_DISCLAIMER"],
    stringsMustNot: [
      'title: "Product"',
      'title: "Learn"',
      'title: "For Teams"',
      'title: "Legal"',
      "Cookie policy",
      "A Decision Companion. Financial Reality",
      "Decision Readiness Intelligence",
      "Decision Readiness Intelligence™",
    ],
    codeMustNot: ["<svg"],
  },
  {
    id: "quiet-home-footer/quiet-cut-forbids-sitemap-wall",
    file: "components/layout/QuietHomeFooter.tsx",
    identifiersMustNot: ["LEGAL_DISCLAIMER"],
    stringsMustNot: [
      'title: "Product"',
      'title: "Learn"',
      'title: "For Teams"',
      'title: "Legal"',
      "Cookie policy",
      "A Decision Companion. Financial Reality",
      "Decision Readiness Intelligence",
      "Decision Readiness Intelligence™",
    ],
    codeMust: ['label: "Cookies"', "{TAGLINES.primary}"],
    codeMustNot: ["<svg"],
  },
];

export const SCORING_IMPORT_GUARD_ROOTS = [
  "components/finance",
  "lib/planner",
  "components/planner",
] as const;

export const SCORING_FORBIDDEN_MODULES = [
  "@/lib/scoring/engine",
  "@/lib/scoring/weights",
  "@/lib/scoring/insights",
  "@/lib/scoring/shadow",
] as const;

export const SCORING_PUBLIC_SEAM = "@/lib/scoring/public";

// Scoring import-guard tests walk every .ts/.tsx under SCORING_IMPORT_GUARD_ROOTS
// and fail if a line matches from "@/lib/scoring/(engine|weights|insights|shadow)".
// Finance also requires at least one file to import SCORING_PUBLIC_SEAM.
// Planner skips lines that include `import type` (type-only from those modules
// is allowed there). Those become a separate import-graph rule — do not encode
// per-file walk results as SourceLockFact rows.
