import { describe, expect, it } from "vitest";
import {
  AGENCY_SYSTEM_PROMPT,
  CALENDAR_STORAGE_KEY,
  COMPETITOR_LOG_MAX,
  DRIP_PRESETS,
  NEVER_SAY_PHRASES,
  PERSONAS,
  PLATFORMS,
  PLATFORM_LIMITS,
  THEME_WEEKS,
  bestPerformingId,
  buildPostPrompt,
  buildScorecardMarkdown,
  calendarKey,
  calendarToText,
  daysInMonth,
  defaultHashtags,
  fitToLimit,
  isClaimClean,
  isPostingDay,
  isValidWebhookUrl,
  monthWeekRows,
  parseCsv,
  parseLinkedInAnalytics,
  parseStoredCalendar,
  parseStoredCompetitorLog,
  parseStoredThemeNotes,
  performanceTotals,
  personaBrief,
  platformMeta,
  postSnippet,
  DEFAULT_SOCIAL_PLATFORM,
  FIRST_CLASS_ENGINES,
  seedCalendarFromEngine,
  slugifyCampaign,
  stripNeverSay,
  STUDIO_PRIMARY_PLATFORMS,
  STUDIO_SECONDARY_PLATFORMS,
  templateWeekPlan,
  repurposeTargets,
  templateAnalyticsSummary,
  templateCaption,
  templateCompetitorAnalysis,
  templateDripSequence,
  templateImageBrief,
  templateInsight,
  templatePost,
  templateRepurpose,
  templateScorecardSummary,
  themeForDayOfMonth,
  themeMonthExport,
  topPostsBy,
  type CalendarBoard,
  type PostPerformanceRow,
  type PostTone,
  type SocialPlatform,
} from "@/lib/admin/marketing-agency";

/**
 * The agency suite's guardrail is the claim-law strip, and its safety net is
 * the template path (what /admin/marketing shows with no ANTHROPIC_API_KEY).
 * Both are pure, so both are tested here rather than through the route.
 */

describe("stripNeverSay", () => {
  it("removes a prohibited phrase and reports it", () => {
    const { clean, flagged } = stripNeverSay("You are pre-approved today.");
    expect(flagged).toContain("pre-approved");
    expect(clean.toLowerCase()).not.toContain("pre-approved");
    expect(clean).toBe("You are today.");
  });

  it("catches spacing variants of a hyphenated phrase", () => {
    expect(stripNeverSay("this is risk free money").flagged).toContain("risk-free");
    expect(stripNeverSay("bank level encryption").flagged).toContain("bank-level");
  });

  it("is case-insensitive", () => {
    expect(stripNeverSay("GUARANTEED results").flagged).toContain("guaranteed");
  });

  it("leaves compliant copy untouched", () => {
    const copy = "Afford ≠ ready. Educational guidance only — not a lender.";
    const { clean, flagged } = stripNeverSay(copy);
    expect(flagged).toEqual([]);
    expect(clean).toBe(copy);
  });

  it("does not treat a word that merely contains a phrase as a match", () => {
    expect(stripNeverSay("The guarantor signed.").flagged).toEqual([]);
  });

  it("backs isClaimClean", () => {
    expect(isClaimClean("A readiness signal, not a verdict on you.")).toBe(true);
    expect(isClaimClean("Our lenders will call you.")).toBe(false);
  });
});

describe("AGENCY_SYSTEM_PROMPT", () => {
  it("carries the denylist so the model sees the same rules the strip enforces", () => {
    for (const phrase of NEVER_SAY_PHRASES) {
      expect(AGENCY_SYSTEM_PROMPT).toContain(phrase);
    }
  });

  it("states the bright lines", () => {
    expect(AGENCY_SYSTEM_PROMPT).toContain("not a lender");
    expect(AGENCY_SYSTEM_PROMPT).toContain("educational guidance only");
  });
});

describe("slugifyCampaign", () => {
  it("lowercases and underscores", () => {
    expect(slugifyCampaign("Afford ≠ Ready")).toBe("afford_ready");
  });

  it("trims separators and caps length", () => {
    expect(slugifyCampaign("  --hello--  ")).toBe("hello");
    expect(slugifyCampaign("x".repeat(80)).length).toBeLessThanOrEqual(40);
  });

  it("falls back rather than returning an empty utm_campaign", () => {
    expect(slugifyCampaign("≠≠≠")).toBe("founder_post");
    expect(slugifyCampaign("")).toBe("founder_post");
  });
});

describe("fitToLimit", () => {
  it("passes text that already fits", () => {
    expect(fitToLimit("short", 20)).toBe("short");
  });

  it("never exceeds the ceiling", () => {
    const long = "word ".repeat(200);
    expect(fitToLimit(long, 50).length).toBeLessThanOrEqual(50);
  });

  it("returns empty rather than a near-whole string at a zero budget", () => {
    expect(fitToLimit("anything", 0)).toBe("");
    expect(fitToLimit("anything", -5)).toBe("");
  });
});

describe("platform metadata", () => {
  it("matches the documented ceilings", () => {
    expect(PLATFORM_LIMITS).toEqual({
      x: 280,
      tiktok: 2200,
      linkedin: 3000,
      instagram: 2200,
      threads: 500,
    });
  });

  it("includes X and TikTok as first-class engines, not Instagram or Threads", () => {
    expect(FIRST_CLASS_ENGINES).toEqual(["x", "tiktok"]);
    expect(DEFAULT_SOCIAL_PLATFORM).toBe("x");
    expect(PLATFORMS.map((p) => p.key)).toEqual([
      "x",
      "tiktok",
      "linkedin",
      "instagram",
      "threads",
    ]);
    expect(STUDIO_PRIMARY_PLATFORMS).toEqual(["x", "tiktok", "linkedin"]);
    expect(STUDIO_SECONDARY_PLATFORMS).toEqual(["instagram", "threads"]);
    expect(platformMeta("x").handle).toBe("@Homi_Tech");
    expect(platformMeta("tiktok").handle).toBe("@homi_technology");
    expect(platformMeta("tiktok").utmSource).toBe("tiktok");
    expect(platformMeta("tiktok").utmMedium).toBe("social");
  });

  it("falls back to X for an unknown key", () => {
    expect(platformMeta("nope" as SocialPlatform).key).toBe("x");
  });

  it("returns the platform's hashtag budget", () => {
    for (const platform of PLATFORMS) {
      expect(defaultHashtags(platform.key)).toHaveLength(platform.hashtagCount);
    }
  });

  it("repurposes without requiring LinkedIn as the source", () => {
    expect(repurposeTargets("x")).toEqual(["tiktok", "linkedin"]);
    expect(repurposeTargets("tiktok")).toEqual(["x", "linkedin"]);
    expect(repurposeTargets("linkedin")).toEqual(["x", "tiktok"]);
    expect(repurposeTargets("x")).not.toContain("instagram");
    expect(repurposeTargets("x")).not.toContain("threads");
  });
});

describe("templatePost", () => {
  const tones: PostTone[] = ["educational", "story", "authority", "hook", "engagement"];

  it("stays inside every platform ceiling for every tone", () => {
    for (const platform of PLATFORMS) {
      for (const tone of tones) {
        const post = templatePost({ platform: platform.key, tone, topic: "buying a first home" });
        expect(post.copy.length).toBeLessThanOrEqual(platform.limit);
        expect(post.copy.length).toBeGreaterThan(0);
      }
    }
  });

  it("is claim-clean by construction", () => {
    for (const tone of tones) {
      const post = templatePost({ platform: "linkedin", tone, topic: "a car purchase" });
      expect(isClaimClean(post.copy)).toBe(true);
    }
  });

  it("suggests a usable utm_campaign", () => {
    const post = templatePost({ platform: "linkedin", tone: "hook", topic: "Afford ≠ Ready" });
    expect(post.utmSuggestion).toBe("linkedin_afford_ready");
  });

  it("handles an empty topic without producing a broken sentence", () => {
    const post = templatePost({ platform: "threads", tone: "story", topic: "   " });
    expect(post.copy).toContain("a major purchase decision");
  });
});

describe("templateCaption", () => {
  it("keeps hook plus body inside the ceiling", () => {
    for (const platform of PLATFORMS) {
      const caption = templateCaption({
        idea: "readiness is not the same as affordability",
        platform: platform.key,
        hookStyle: "question",
      });
      expect(caption.hook.length + caption.body.length).toBeLessThanOrEqual(platform.limit);
      expect(caption.hook.length).toBeGreaterThan(0);
    }
  });

  it("is claim-clean and folds in the image description when given", () => {
    const caption = templateCaption({
      idea: "the month after matters most",
      imageDescription: "compass graphic on navy",
      platform: "instagram",
      hookStyle: "quote",
    });
    expect(isClaimClean(`${caption.hook} ${caption.body}`)).toBe(true);
    expect(caption.body).toContain("compass graphic on navy");
  });
});

describe("templateInsight", () => {
  it("says so plainly when there is nothing to read", () => {
    const { insight } = templateInsight({
      verdictCounts: {},
      channelCounts: [],
      interestCounts: [],
    });
    expect(insight).toContain("not enough data");
  });

  it("leads with urgency when the audience is mostly ready", () => {
    const { insight } = templateInsight({
      verdictCounts: { READY: 8, NOT_YET: 2 },
      channelCounts: [{ label: "linkedin", count: 12 }],
      interestCounts: [{ interest: "home", count: 5 }],
    });
    expect(insight).toContain("80%");
    expect(insight).toContain("linkedin");
    expect(insight).toContain("home");
  });

  it("leads with Build First when the audience is mostly still building", () => {
    const { insight } = templateInsight({
      verdictCounts: { READY: 1, BUILD_FIRST: 9 },
      channelCounts: [],
      interestCounts: [],
    });
    expect(insight).toContain("Build First");
  });
});

describe("content calendar", () => {
  const enginePosts = [
    { day: "Mon", title: "Founder why", campaign: "w1_founder_why" },
    { day: "Wed", title: "Afford ≠ ready", campaign: "w1_afford" },
    { day: "Fri", title: "Build First", campaign: "w1_build_first" },
  ];

  it("uses a stable storage key", () => {
    expect(CALENDAR_STORAGE_KEY).toBe("homi-content-calendar");
  });

  it("seeds Mon/Wed/Fri mornings from the engine slate on X, not LinkedIn", () => {
    const board = seedCalendarFromEngine(enginePosts);
    expect(Object.keys(board).sort()).toEqual(
      ["Mon:morning", "Wed:morning", "Fri:morning"].sort(),
    );
    expect(board[calendarKey("Mon", "morning")]?.campaign).toBe("w1_founder_why");
    expect(board[calendarKey("Mon", "morning")]?.platform).toBe("x");
    expect(Object.values(board).every((entry) => entry?.platform !== "linkedin")).toBe(true);
  });

  it("seeds X mornings and TikTok afternoons when the slate names both engines", () => {
    const board = seedCalendarFromEngine([
      { day: "Mon", title: "Founder why", campaign: "w1_founder_why", platform: "x" },
      { day: "Mon", title: "Founder why", campaign: "w1_founder_why_tt", platform: "tiktok" },
      { day: "Wed", title: "Afford ≠ ready", campaign: "w1_afford", platform: "x" },
      { day: "Wed", title: "Afford ≠ ready", campaign: "w1_afford_tt", platform: "tiktok" },
    ]);
    expect(board[calendarKey("Mon", "morning")]?.platform).toBe("x");
    expect(board[calendarKey("Mon", "afternoon")]?.platform).toBe("tiktok");
    expect(board[calendarKey("Wed", "morning")]?.platform).toBe("x");
    expect(board[calendarKey("Wed", "afternoon")]?.platform).toBe("tiktok");
    expect(Object.values(board).some((entry) => entry?.platform === "linkedin")).toBe(false);
  });

  it("falls back to Mon/Wed/Fri when the slate names days it does not recognise", () => {
    const board = seedCalendarFromEngine([
      { day: "Someday", title: "A", campaign: "a" },
      { day: "Otherday", title: "B", campaign: "b" },
    ]);
    expect(Object.keys(board).sort()).toEqual(["Mon:morning", "Wed:morning"].sort());
  });

  it("round-trips through storage", () => {
    const board = seedCalendarFromEngine(enginePosts);
    expect(parseStoredCalendar(JSON.stringify(board))).toEqual(board);
  });

  it("drops malformed stored entries instead of rendering them", () => {
    const stored = JSON.stringify({
      "Mon:morning": {
        day: "Mon",
        slot: "morning",
        platform: "linkedin",
        tone: "hook",
        campaign: "ok",
        copy: "keep me",
      },
      "Bad:morning": { day: "Bad", slot: "morning", campaign: "x", copy: "drop me" },
      "Tue:afternoon": { day: "Tue", slot: "afternoon", campaign: "x" },
    });
    const board = parseStoredCalendar(stored);
    expect(Object.keys(board ?? {})).toEqual(["Mon:morning"]);
  });

  it("repairs an unknown platform or tone rather than dropping the post", () => {
    const stored = JSON.stringify({
      "Mon:morning": {
        day: "Mon",
        slot: "morning",
        platform: "myspace",
        tone: "shouty",
        campaign: "ok",
        copy: "keep me",
      },
    });
    const entry = parseStoredCalendar(stored)?.[calendarKey("Mon", "morning")];
    expect(entry?.platform).toBe("x");
    expect(entry?.tone).toBe("authority");
  });

  it("returns null for absent or unparseable storage", () => {
    expect(parseStoredCalendar(null)).toBeNull();
    expect(parseStoredCalendar("not json")).toBeNull();
    expect(parseStoredCalendar("[1,2,3]")).toBeNull();
  });

  it("exports one post per line in week order", () => {
    const board: CalendarBoard = {
      "Wed:morning": {
        day: "Wed",
        slot: "morning",
        platform: "x",
        tone: "hook",
        campaign: "w1_afford",
        copy: "line one\nline two",
      },
      "Mon:afternoon": {
        day: "Mon",
        slot: "afternoon",
        platform: "linkedin",
        tone: "story",
        campaign: "w1_founder_why",
        copy: "founder why",
      },
    };
    const lines = calendarToText(board).split("\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Mon · Afternoon · LinkedIn");
    expect(lines[1]).toContain("Wed · Morning · X");
    // Newlines inside a post would break the one-post-per-line contract.
    expect(lines[1]).toContain("line one line two");
  });

  it("exports nothing for an empty week", () => {
    expect(calendarToText({})).toBe("");
  });
});

describe("templateWeekPlan", () => {
  it("is not a LinkedIn-only week", () => {
    const { slots } = templateWeekPlan();
    const platforms = new Set(slots.map((s) => s.platform));
    expect(platforms.has("x")).toBe(true);
    expect(platforms.has("tiktok")).toBe(true);
    expect(slots.every((s) => s.platform === "linkedin")).toBe(false);
  });
});

/* ================================================================== *
 * Tier 2
 * ================================================================== */

describe("personas", () => {
  it("treats the general ICP as no persona at all", () => {
    expect(personaBrief("all")).toBe("");
  });

  it("hands the model a label plus the anxiety, not just a label", () => {
    const brief = personaBrief("self_employed");
    expect(brief).toContain("Self-employed buyer");
    expect(brief).toContain("variable income");
  });

  it("keeps every persona description usable as prompt prose", () => {
    for (const persona of PERSONAS.slice(1)) {
      expect(persona.description.length).toBeGreaterThan(10);
    }
  });

  it("injects the persona into the post prompt only when one is set", () => {
    const base = { platform: "linkedin" as const, tone: "story" as const, topic: "a first home" };
    expect(buildPostPrompt(base)).not.toContain("ICP persona");
    expect(buildPostPrompt({ ...base, persona: personaBrief("first_time") })).toContain(
      "First-time buyer",
    );
  });

  it("names the persona in template output rather than pretending to target", () => {
    const post = templatePost({
      platform: "linkedin",
      tone: "hook",
      topic: "a first home",
      persona: personaBrief("recently_divorced"),
    });
    expect(post.copy).toContain("Written for:");
    expect(isClaimClean(post.copy)).toBe(true);
  });
});

describe("templateRepurpose", () => {
  it("never exceeds the target platform ceiling", () => {
    const source = "This is a LinkedIn post. ".repeat(200);
    for (const platform of PLATFORMS) {
      const post = templateRepurpose({ sourceCopy: source, targetPlatform: platform.key });
      expect(post.copy.length).toBeLessThanOrEqual(platform.limit);
    }
  });

  it("strips claim-law phrasing carried over from the source", () => {
    const post = templateRepurpose({
      sourceCopy: "You are pre-approved and ready.",
      targetPlatform: "x",
    });
    expect(isClaimClean(post.copy)).toBe(true);
  });
});

describe("buildScorecardMarkdown", () => {
  const metrics = {
    activationsLast7: 12,
    accountsLast7: 30,
    waitlistLast7: 8,
    waitlistTotal: 140,
    accountsTotal: 320,
    assessedUsers: 95,
    paidTotal: 7,
    mrrCents: 13_900,
    activationRate7d: 40,
    channels: [
      { label: "linkedin", count: 22 },
      { label: "direct", count: 9 },
    ],
  };

  it("carries every documented heading", () => {
    const md = buildScorecardMarkdown(metrics, new Date(Date.UTC(2026, 7, 16)));
    for (const heading of [
      "### North Star",
      "### Pipeline",
      "### Revenue",
      "### Top channels this week",
      "### Wins this week",
      "### Blockers",
      "### Next week focus",
    ]) {
      expect(md).toContain(heading);
    }
    expect(md).toContain("## HōMI Weekly Scorecard — WEEK ending");
  });

  it("prints the numbers it was given", () => {
    const md = buildScorecardMarkdown(metrics, new Date(Date.UTC(2026, 7, 16)));
    expect(md).toContain("- Unique activated users (7d): 12");
    expect(md).toContain("- Cohort activation rate: 40% of new accounts (cohort)");
    expect(md).toContain("- MRR (est.): $139");
    expect(md).toContain("1. linkedin — 22");
  });

  it("always prints three channel lines so the shape never shifts", () => {
    const md = buildScorecardMarkdown({ ...metrics, channels: [] }, new Date(Date.UTC(2026, 7, 16)));
    expect(md).toContain("1. —");
    expect(md).toContain("2. —");
    expect(md).toContain("3. —");
  });

  it("says em dash rather than a fake percentage with no accounts to divide by", () => {
    const md = buildScorecardMarkdown(
      { ...metrics, activationRate7d: null },
      new Date(Date.UTC(2026, 7, 16)),
    );
    expect(md).toContain("- Cohort activation rate: — (n under 5 or no new accounts)");
  });
});

describe("templateScorecardSummary", () => {
  it("names a dead week as a distribution problem", () => {
    const { summary } = templateScorecardSummary({
      activationsLast7: 0,
      accountsLast7: 0,
      waitlistLast7: 0,
      mrrCents: 0,
      topChannel: "",
    });
    expect(summary).toContain("distribution problem");
  });

  it("calls out untagged links when direct leads", () => {
    const { summary } = templateScorecardSummary({
      activationsLast7: 4,
      accountsLast7: 10,
      waitlistLast7: 2,
      mrrCents: 0,
      topChannel: "direct",
    });
    expect(summary).toContain("UTM");
  });

  it("is claim-clean", () => {
    const { summary } = templateScorecardSummary({
      activationsLast7: 9,
      accountsLast7: 10,
      waitlistLast7: 40,
      mrrCents: 5000,
      topChannel: "linkedin",
    });
    expect(isClaimClean(summary)).toBe(true);
  });
});

describe("templateImageBrief", () => {
  it("produces both briefs and stays claim-clean", () => {
    const brief = templateImageBrief({
      captionHook: "You can afford it and still not be ready",
      captionBody: "Affordability is arithmetic.",
      platform: "instagram",
    });
    expect(brief.canva_prompt.length).toBeGreaterThan(40);
    expect(brief.midjourney_prompt).toContain("navy");
    expect(brief.style_notes.length).toBeGreaterThan(20);
    expect(isClaimClean(`${brief.canva_prompt} ${brief.midjourney_prompt}`)).toBe(true);
  });

  it("falls back to a usable hook when the caption is empty", () => {
    const brief = templateImageBrief({ captionHook: "  ", captionBody: "", platform: "linkedin" });
    expect(brief.canva_prompt).toContain("Afford ≠ ready");
  });
});

describe("parseCsv", () => {
  it("keeps commas inside quoted fields", () => {
    expect(parseCsv('a,"b,c",d')).toEqual([["a", "b,c", "d"]]);
  });

  it("unescapes doubled quotes", () => {
    expect(parseCsv('"say ""hi""",2')).toEqual([['say "hi"', "2"]]);
  });

  it("survives CRLF and drops blank rows", () => {
    expect(parseCsv("a,b\r\n\r\nc,d\r\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("returns nothing for empty input", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("parseLinkedInAnalytics", () => {
  const csv = [
    '"LinkedIn post analytics export"',
    "Post title,Published date,Impressions,Unique impressions,Clicks,Likes,Comments,Shares,CTR,Engagement rate",
    '"Afford, not ready",2026-07-01,"1,200",1000,60,10,2,1,5.00%,7.2%',
    '"The month after",2026-07-08,800,700,80,5,1,0,10.00%,9.1%',
  ].join("\n");

  it("skips the metadata block and locates columns by header", () => {
    const posts = parseLinkedInAnalytics(csv);
    expect(posts).toHaveLength(2);
    expect(posts[0]).toMatchObject({
      title: "Afford, not ready",
      date: "2026-07-01",
      impressions: 1200,
      clicks: 60,
      ctr: 5,
    });
  });

  it("prefers the impressions column over unique impressions", () => {
    expect(parseLinkedInAnalytics(csv)[0]?.impressions).toBe(1200);
  });

  it("derives CTR when the export omits it", () => {
    const noCtr = [
      "Post title,Published date,Impressions,Unique impressions,Clicks",
      "Hook test,2026-07-01,1000,900,50",
    ].join("\n");
    expect(parseLinkedInAnalytics(noCtr)[0]?.ctr).toBe(5);
  });

  it("reads a fractional CTR as a percentage", () => {
    const fractional = [
      "Post title,Published date,Impressions,Unique impressions,Clicks,Likes,Comments,Shares,CTR",
      "Hook test,2026-07-01,1000,900,50,0,0,0,0.05",
    ].join("\n");
    expect(parseLinkedInAnalytics(fractional)[0]?.ctr).toBe(5);
  });

  it("drops rows with no reach and no clicks", () => {
    const withEmpty = [
      "Post title,Published date,Impressions,Unique impressions,Clicks",
      "Real post,2026-07-01,10,9,1",
      "Empty post,2026-07-02,0,0,0",
    ].join("\n");
    expect(parseLinkedInAnalytics(withEmpty)).toHaveLength(1);
  });

  it("returns nothing rather than throwing on junk", () => {
    expect(parseLinkedInAnalytics("")).toEqual([]);
    expect(parseLinkedInAnalytics("not a csv at all")).toEqual([]);
  });

  it("ranks by the requested key", () => {
    const posts = parseLinkedInAnalytics(csv);
    expect(topPostsBy(posts, "impressions")[0]?.title).toBe("Afford, not ready");
    expect(topPostsBy(posts, "ctr")[0]?.title).toBe("The month after");
    expect(topPostsBy(posts, "clicks", 1)).toHaveLength(1);
  });
});

describe("templateAnalyticsSummary", () => {
  it("says what to paste when nothing parsed", () => {
    expect(templateAnalyticsSummary([]).summary).toContain("Post title");
  });

  it("reports reach share and names the CTR winner when they diverge", () => {
    const summary = templateAnalyticsSummary([
      { title: "Wide reach", date: "", impressions: 900, clicks: 9, ctr: 1 },
      { title: "High intent", date: "", impressions: 100, clicks: 20, ctr: 20 },
    ]);
    expect(summary.summary).toContain("2 posts parsed");
    expect(summary.summary).toContain("90%");
    expect(summary.summary).toContain("High intent");
    expect(summary.recommended_hooks[0]).toBe("High intent");
  });
});

describe("drip sequences", () => {
  it("gives every preset at least one step and a stated audience", () => {
    for (const preset of DRIP_PRESETS) {
      expect(preset.steps.length).toBeGreaterThan(0);
      expect(preset.audience.length).toBeGreaterThan(5);
    }
  });

  it("fills the launch preset with four claim-clean emails", () => {
    const steps = templateDripSequence({
      preset: "launch",
      steps: DRIP_PRESETS[0]!.steps,
    });
    expect(steps).toHaveLength(4);
    for (const step of steps) {
      expect(step.subject.length).toBeGreaterThan(5);
      expect(step.body.length).toBeGreaterThan(50);
      expect(isClaimClean(`${step.subject}\n${step.body}`)).toBe(true);
    }
    expect(steps.map((s) => s.step)).toEqual([1, 2, 3, 4]);
  });

  it("keeps the delay it was handed rather than inventing one", () => {
    const steps = templateDripSequence({
      preset: "custom",
      steps: [{ name: "Kickoff", delayDays: 0 }, { name: "Follow up", delayDays: 9 }],
    });
    expect(steps[1]).toMatchObject({ name: "Follow up", delay_days: 9 });
  });

  it("recycles subjects rather than emptying them when there are more steps than templates", () => {
    const steps = templateDripSequence({
      preset: "custom",
      steps: Array.from({ length: 4 }, (_, i) => ({ name: `Step ${i}`, delayDays: i })),
    });
    for (const step of steps) expect(step.subject).not.toBe("");
  });
});

describe("competitor pulse", () => {
  it("drops entries with no id or no hook", () => {
    const stored = JSON.stringify([
      { id: "a", account: "x", date: "2026-07-01", hook: "keep me", tags: ["rates"] },
      { id: "", account: "y", date: "", hook: "no id", tags: [] },
      { id: "c", account: "z", date: "", hook: "", tags: [] },
    ]);
    const log = parseStoredCompetitorLog(stored);
    expect(log).toHaveLength(1);
    expect(log[0]?.hook).toBe("keep me");
  });

  it("drops unknown tags rather than the whole row", () => {
    const stored = JSON.stringify([
      { id: "a", hook: "h", account: "", date: "", tags: ["rates", "astrology"] },
    ]);
    expect(parseStoredCompetitorLog(stored)[0]?.tags).toEqual(["rates"]);
  });

  it("caps the log and survives junk", () => {
    const many = JSON.stringify(
      Array.from({ length: 80 }, (_, i) => ({ id: String(i), hook: "h", account: "", date: "", tags: [] })),
    );
    expect(parseStoredCompetitorLog(many)).toHaveLength(COMPETITOR_LOG_MAX);
    expect(parseStoredCompetitorLog(null)).toEqual([]);
    expect(parseStoredCompetitorLog("not json")).toEqual([]);
    expect(parseStoredCompetitorLog('{"not":"an array"}')).toEqual([]);
  });

  it("names readiness as open ground when nobody logged is claiming it", () => {
    const analysis = templateCompetitorAnalysis([
      { id: "a", account: "x", date: "", hook: "Rates are moving", tags: ["rates"] },
    ]);
    expect(analysis.patterns).toHaveLength(1);
    expect(analysis.gaps.join(" ")).toContain("decision readiness");
    expect(analysis.recommendations).toHaveLength(3);
  });

  it("still returns three recommendations with an empty log", () => {
    const analysis = templateCompetitorAnalysis([]);
    expect(analysis.recommendations).toHaveLength(3);
    expect(analysis.patterns[0]).toContain("Nothing logged yet");
  });
});

describe("themed calendar", () => {
  it("rotates four themes a week at a time and wraps after week 4", () => {
    expect(themeForDayOfMonth(1).label).toBe("Founder Story");
    expect(themeForDayOfMonth(7).label).toBe("Founder Story");
    expect(themeForDayOfMonth(8).label).toBe("ICP Pain");
    expect(themeForDayOfMonth(22).label).toBe("Product / Path");
    expect(themeForDayOfMonth(29).label).toBe("Founder Story");
    expect(THEME_WEEKS).toHaveLength(4);
  });

  it("chunks a month into rows of seven with a short final row", () => {
    const rows = monthWeekRows(2026, 7); // August 2026, 31 days
    expect(daysInMonth(2026, 7)).toBe(31);
    expect(rows.map((r) => r.length)).toEqual([7, 7, 7, 7, 3]);
    expect(rows.flat()).toHaveLength(31);
    expect(rows[0]?.[0]).toBe(1);
    expect(rows[4]?.[2]).toBe(31);
  });

  it("handles February in a leap year", () => {
    expect(daysInMonth(2028, 1)).toBe(29);
    expect(monthWeekRows(2028, 1).flat()).toHaveLength(29);
  });

  it("finds exactly three posting days in any seven consecutive days", () => {
    const firstWeek = monthWeekRows(2026, 0)[0]!;
    expect(firstWeek.filter((day) => isPostingDay(2026, 0, day))).toHaveLength(3);
  });

  it("exports one line per posting day, dated and tagged", () => {
    const lines = themeMonthExport(2026, 7).split("\n");
    const postingDays = monthWeekRows(2026, 7)
      .flat()
      .filter((day) => isPostingDay(2026, 7, day));
    expect(lines).toHaveLength(postingDays.length);
    for (const line of lines) {
      expect(line).toMatch(/^2026-08-\d{2} — .+ — [a-z0-9_]+$/);
    }
  });

  it("keeps only well-formed note keys", () => {
    const notes = parseStoredThemeNotes(
      JSON.stringify({ "2026-08-03": "angle", "not-a-date": "drop me", "2026-08-04": 12 }),
    );
    expect(notes).toEqual({ "2026-08-03": "angle" });
    expect(parseStoredThemeNotes(null)).toEqual({});
    expect(parseStoredThemeNotes("[1,2]")).toEqual({});
  });
});

describe("webhook targets", () => {
  it("accepts https and rejects everything else", () => {
    expect(isValidWebhookUrl("https://hooks.example.com/abc")).toBe(true);
    expect(isValidWebhookUrl("  https://hooks.example.com/abc  ")).toBe(true);
    expect(isValidWebhookUrl("http://hooks.example.com/abc")).toBe(false);
    expect(isValidWebhookUrl("javascript:alert(1)")).toBe(false);
    expect(isValidWebhookUrl("data:text/plain,hi")).toBe(false);
    expect(isValidWebhookUrl("")).toBe(false);
    expect(isValidWebhookUrl("not a url")).toBe(false);
  });
});

describe("post performance", () => {
  const row = (over: Partial<PostPerformanceRow>): PostPerformanceRow => ({
    id: "1",
    created_at: "2026-08-01T00:00:00Z",
    platform: "linkedin",
    utm_campaign: "w1",
    utm_source: "linkedin",
    post_snippet: "snippet",
    posted_at: "2026-08-01",
    impressions: null,
    clicks: null,
    completions: null,
    notes: null,
    ...over,
  });

  it("collapses whitespace and caps the snippet at 120 characters", () => {
    expect(postSnippet("  a\n\n b  ")).toBe("a b");
    expect(postSnippet("x".repeat(300))).toHaveLength(120);
  });

  it("treats a missing metric as unknown, not as zero", () => {
    const totals = performanceTotals([
      row({ id: "a", impressions: 1000, clicks: 50, completions: 3 }),
      row({ id: "b" }),
    ]);
    expect(totals).toEqual({ impressions: 1000, clicks: 50, completions: 3, ctr: 5 });
  });

  it("reports no CTR rather than dividing by zero", () => {
    expect(performanceTotals([row({})]).ctr).toBeNull();
    expect(performanceTotals([]).ctr).toBeNull();
  });

  it("crowns the row with the most completions, not the most reach", () => {
    const rows = [
      row({ id: "reach", impressions: 100_000, completions: 1 }),
      row({ id: "converter", impressions: 200, completions: 9 }),
    ];
    expect(bestPerformingId(rows)).toBe("converter");
  });

  it("crowns nothing when no row has a completion", () => {
    expect(bestPerformingId([row({ id: "a", impressions: 5000 }), row({ id: "b" })])).toBeNull();
    expect(bestPerformingId([])).toBeNull();
  });
});
