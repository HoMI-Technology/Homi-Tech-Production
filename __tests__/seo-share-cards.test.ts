import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { TAGLINES } from "@/lib/brand";
import {
  SHARE_OG_DESCRIPTION,
  SHARE_OG_IMAGE,
  SHARE_OG_TITLE,
  SHARE_TWITTER_IMAGE,
  defaultShareOpenGraph,
  defaultShareTwitter,
} from "@/lib/seo/share";

const ROOT = process.cwd();
const APP = join(ROOT, "app");
const PUBLIC_DIR = join(ROOT, "public");

/** v3 Brand-PASSed OG 1200×630 — do not re-encode. */
const OG_SHA256 = "ca6248bb89b4e3e5b21d84c160700660ca5b1e0a3c7b7d53e548084ebb796bdf";
/** v3 Brand-PASSed Twitter 1200×600 — do not re-encode. */
const TWITTER_SHA256 = "011d8ca211fe7dfb79825e000a186dd206b4af2434ec87fbd61d723c67735868";

const SHARE_ALT = "HōMI — Will you be okay?";

function sha256File(absPath: string): string {
  return createHash("sha256").update(readFileSync(absPath)).digest("hex");
}

function pngDimensions(absPath: string): { width: number; height: number } {
  const buf = readFileSync(absPath);
  expect(buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true);
  expect(buf.toString("ascii", 12, 16)).toBe("IHDR");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe("share cards — Brand-PASSed bytes", () => {
  it("keeps public/og-v3.png at the PASSed SHA-256 and 1200×630", () => {
    const abs = join(PUBLIC_DIR, "og-v3.png");
    expect(existsSync(abs)).toBe(true);
    expect(sha256File(abs)).toBe(OG_SHA256);
    expect(pngDimensions(abs)).toEqual({ width: 1200, height: 630 });
    expect(readFileSync(abs).byteLength).toBeGreaterThan(0);
  });

  it("keeps public/twitter-v3.png at the PASSed SHA-256 and 1200×600", () => {
    const abs = join(PUBLIC_DIR, "twitter-v3.png");
    expect(existsSync(abs)).toBe(true);
    expect(sha256File(abs)).toBe(TWITTER_SHA256);
    expect(pngDimensions(abs)).toEqual({ width: 1200, height: 600 });
    expect(readFileSync(abs).byteLength).toBeGreaterThan(0);
  });
});

describe("share cards — no root ImageResponse convention", () => {
  it("removes app/opengraph-image.* and app/twitter-image.* so metadata images win", () => {
    const convention = readdirSync(APP).filter((name) =>
      /^(opengraph-image|twitter-image)(\.|$)/.test(name),
    );
    expect(convention).toEqual([]);
    expect(existsSync(join(APP, "opengraph-image.tsx"))).toBe(false);
    expect(existsSync(join(APP, "twitter-image.tsx"))).toBe(false);
  });

  it("does not import next/og from the default share metadata module", () => {
    const share = readFileSync(join(ROOT, "lib/seo/share.ts"), "utf8");
    expect(share).not.toContain('from "next/og"');
    expect(share).not.toContain("from 'next/og'");
    expect(share).not.toMatch(/new\s+ImageResponse/);
    expect(share).toContain("/og-v3.png");
    expect(share).toContain("/twitter-v3.png");
  });
});

describe("share cards — default OG / Twitter strings", () => {
  it("pins the exact og:title and og:description", () => {
    expect(SHARE_OG_TITLE).toBe("HōMI — Will you be okay?");
    expect(SHARE_OG_DESCRIPTION).toBe(TAGLINES.primary);
    expect(SHARE_OG_DESCRIPTION).toBe("Know when you're ready. Move when it matters.");
    expect(SHARE_OG_IMAGE.alt).toBe(SHARE_ALT);
    expect(SHARE_TWITTER_IMAGE.alt).toBe(SHARE_ALT);

    const og = defaultShareOpenGraph();
    expect(og.title).toBe("HōMI — Will you be okay?");
    expect(og.description).toBe("Know when you're ready. Move when it matters.");
    expect(og.images).toEqual([
      { url: "/og-v3.png", width: 1200, height: 630, alt: SHARE_ALT },
    ]);

    const twitter = defaultShareTwitter();
    expect(twitter.card).toBe("summary_large_image");
    expect(twitter.title).toBe("HōMI — Will you be okay?");
    expect(twitter.description).toBe("Know when you're ready. Move when it matters.");
    expect(twitter.images).toEqual([
      {
        url: "/twitter-v3.png",
        width: 1200,
        height: 600,
        alt: SHARE_ALT,
      },
    ]);
  });

  it("wires those defaults through root layout and the homepage", () => {
    const layout = readFileSync(join(APP, "layout.tsx"), "utf8");
    const home = readFileSync(join(APP, "(marketing)/page.tsx"), "utf8");
    for (const source of [layout, home]) {
      expect(source).toContain("defaultShareOpenGraph");
      expect(source).toContain("defaultShareTwitter");
      expect(source).not.toContain("ImageResponse");
    }
  });

  it("locks the ranking HTML titles the SEO merge set (#267)", () => {
    const layout = readFileSync(join(APP, "layout.tsx"), "utf8");
    const home = readFileSync(join(APP, "(marketing)/page.tsx"), "utf8");
    const how = readFileSync(join(APP, "(marketing)/how-it-works/page.tsx"), "utf8");
    const pricing = readFileSync(join(APP, "(marketing)/pricing/page.tsx"), "utf8");
    const firstMoment = readFileSync(join(APP, "(marketing)/first-moment/page.tsx"), "utf8");
    expect(layout).toContain('default: "HōMI"');
    expect(home).toContain('title: "Decision Readiness · A Decision Companion · HōMI"');
    expect(how).toContain('title: "HōMI Score · How it works · HōMI"');
    expect(pricing).toContain('title: "HōMI Pricing · HōMI"');
    expect(firstMoment).toContain('title: "First Moment · HōMI"');
  });
});
