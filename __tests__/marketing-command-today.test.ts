import { describe, expect, it } from "vitest";
import {
  DEFAULT_UTM_SOURCE,
  ENGINE_WEEK_POSTS,
  GROWTH_ENGINES,
  LIBRARY_SECTIONS,
  MARKETING_LOCK,
  UTM_PRESETS,
  isSundayInNy,
  todaySecondaryCtas,
  truncateLabel,
} from "@/lib/admin/marketing-command";

describe("isSundayInNy", () => {
  it("returns true for a known Sunday instant in America/New_York", () => {
    // 2026-08-16 18:00 UTC = Sunday afternoon ET (EDT)
    const sunday = new Date("2026-08-16T18:00:00.000Z");
    expect(isSundayInNy(sunday)).toBe(true);
  });

  it("returns false for a known Monday instant in America/New_York", () => {
    // 2026-08-17 18:00 UTC = Monday afternoon ET
    const monday = new Date("2026-08-17T18:00:00.000Z");
    expect(isSundayInNy(monday)).toBe(false);
  });
});

describe("todaySecondaryCtas", () => {
  it("orders Scoreboard first on Sunday (NY)", () => {
    const sunday = new Date("2026-08-16T18:00:00.000Z");
    const labels = todaySecondaryCtas({ now: sunday }).map((c) => c.label);
    expect(labels[0]).toBe("Scoreboard");
    expect(labels).toEqual(["Scoreboard", "Engine", "Proof", "Email"]);
  });

  it("uses Engine-first order on non-Sunday", () => {
    const monday = new Date("2026-08-17T18:00:00.000Z");
    const labels = todaySecondaryCtas({ now: monday }).map((c) => c.label);
    expect(labels).toEqual(["Engine", "Proof", "Email", "Scoreboard"]);
  });

  it("omits Scoreboard secondary when primary is already Scoreboard", () => {
    const monday = new Date("2026-08-17T18:00:00.000Z");
    const labels = todaySecondaryCtas({
      now: monday,
      primaryIsScoreboard: true,
    }).map((c) => c.label);
    expect(labels).toEqual(["Engine", "Proof", "Email"]);
  });
});

describe("LIBRARY_SECTIONS launch agency", () => {
  const agency = LIBRARY_SECTIONS.find((s) => s.id === "agency");

  it("registers a Launch agency section before Operate", () => {
    expect(agency).toBeDefined();
    expect(agency?.title).toBe("Launch agency");
    expect(LIBRARY_SECTIONS[0]?.id).toBe("agency");
    expect(LIBRARY_SECTIONS.some((s) => s.id === "ops")).toBe(true);
  });

  it("links the seven doctrine files under /marketing/agency/", () => {
    const hrefs = agency?.items.map((i) => i.href) ?? [];
    expect(hrefs).toEqual([
      "/marketing/agency/README.md",
      "/marketing/agency/01-NARRATIVE.md",
      "/marketing/agency/02-DESKS.md",
      "/marketing/agency/03-LAUNCH-90.md",
      "/marketing/agency/04-COPY-SYSTEM.md",
      "/marketing/agency/05-CREATIVE-BRIEF.md",
      "/marketing/agency/06-MEASUREMENT.md",
    ]);
    expect(agency?.items.every((i) => i.external === true)).toBe(true);
  });
});

describe("truncateLabel", () => {
  it("leaves short strings alone", () => {
    expect(truncateLabel("@Homi_Tech", 56)).toBe("@Homi_Tech");
  });

  it("truncates long strings with ellipsis", () => {
    const long = "a".repeat(60);
    const out = truncateLabel(long, 56);
    expect(out.length).toBeLessThanOrEqual(56);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("growth engines and this-week slate", () => {
  it("names X and TikTok as the engines, not LinkedIn-only", () => {
    expect(MARKETING_LOCK.channel).toBe("X @Homi_Tech · TikTok @homi_technology");
    expect(MARKETING_LOCK.channel.toLowerCase()).not.toBe("linkedin founder");
    expect(GROWTH_ENGINES.map((e) => e.key)).toEqual(["x", "tiktok"]);
    expect(GROWTH_ENGINES[0]?.handle).toBe("@Homi_Tech");
    expect(GROWTH_ENGINES[1]?.handle).toBe("@homi_technology");
    expect(GROWTH_ENGINES[1]?.href).toBe("https://www.tiktok.com/@homi_technology");
  });

  it("keeps the engine week on X and TikTok", () => {
    const platforms = new Set(ENGINE_WEEK_POSTS.map((p) => p.platform));
    expect(platforms.has("x")).toBe(true);
    expect(platforms.has("tiktok")).toBe(true);
    expect(ENGINE_WEEK_POSTS.every((p) => p.platform === "x" || p.platform === "tiktok")).toBe(
      true,
    );
  });

  it("exports UTM presets for x and tiktok, not Product Hunt", () => {
    expect(DEFAULT_UTM_SOURCE).toBe("x");
    expect(UTM_PRESETS.map((p) => p.source)).toEqual(["x", "tiktok", "linkedin", "email"]);
    const sources: string[] = UTM_PRESETS.map((p) => p.source);
    expect(sources).not.toContain("producthunt");
    expect(UTM_PRESETS.find((p) => p.source === "tiktok")).toEqual({
      source: "tiktok",
      medium: "social",
      campaign: "founder_post",
    });
  });
});
