import { describe, expect, it } from "vitest";
import {
  AGENCY_SYSTEM_PROMPT,
  CALENDAR_STORAGE_KEY,
  NEVER_SAY_PHRASES,
  PLATFORMS,
  PLATFORM_LIMITS,
  calendarKey,
  calendarToText,
  defaultHashtags,
  fitToLimit,
  isClaimClean,
  parseStoredCalendar,
  platformMeta,
  seedCalendarFromEngine,
  slugifyCampaign,
  stripNeverSay,
  templateCaption,
  templateInsight,
  templatePost,
  type CalendarBoard,
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
    expect(PLATFORM_LIMITS).toEqual({ linkedin: 3000, x: 280, instagram: 2200, threads: 500 });
  });

  it("falls back to LinkedIn for an unknown key", () => {
    expect(platformMeta("nope" as SocialPlatform).key).toBe("linkedin");
  });

  it("returns the platform's hashtag budget", () => {
    for (const platform of PLATFORMS) {
      expect(defaultHashtags(platform.key)).toHaveLength(platform.hashtagCount);
    }
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

  it("seeds Mon/Wed/Fri mornings from the engine slate", () => {
    const board = seedCalendarFromEngine(enginePosts);
    expect(Object.keys(board).sort()).toEqual(
      ["Mon:morning", "Wed:morning", "Fri:morning"].sort(),
    );
    expect(board[calendarKey("Mon", "morning")]?.campaign).toBe("w1_founder_why");
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
    expect(entry?.platform).toBe("linkedin");
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
    expect(lines[1]).toContain("Wed · Morning · Twitter/X");
    // Newlines inside a post would break the one-post-per-line contract.
    expect(lines[1]).toContain("line one line two");
  });

  it("exports nothing for an empty week", () => {
    expect(calendarToText({})).toBe("");
  });
});
