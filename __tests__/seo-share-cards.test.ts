import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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

/** Brand-PASSed OG 1200×630 — do not re-encode. */
const OG_SHA256 = "bfbbb4d1f88301bc530c582932792acedbb968ab04c4e65e7a96a45573acb9e5";
/** Brand-PASSed Twitter 1200×600 — do not re-encode. */
const TWITTER_SHA256 = "be40a84069489e7874cad9fb0505d91930dc3a5f104a1d09cc41bb2e3396b1ee";

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
  it("keeps public/og-v2.png at the PASSed SHA-256 and 1200×630", () => {
    const abs = join(PUBLIC_DIR, "og-v2.png");
    expect(existsSync(abs)).toBe(true);
    expect(sha256File(abs)).toBe(OG_SHA256);
    expect(pngDimensions(abs)).toEqual({ width: 1200, height: 630 });
    expect(readFileSync(abs).byteLength).toBeGreaterThan(0);
  });

  it("keeps public/twitter-v2.png at the PASSed SHA-256 and 1200×600", () => {
    const abs = join(PUBLIC_DIR, "twitter-v2.png");
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

  it("does not import ImageResponse from the default share metadata module", () => {
    const share = readFileSync(join(ROOT, "lib/seo/share.ts"), "utf8");
    expect(share).not.toContain("ImageResponse");
    expect(share).not.toContain("next/og");
  });
});

describe("share cards — default OG / Twitter strings", () => {
  it("pins the exact og:title and og:description", () => {
    expect(SHARE_OG_TITLE).toBe("HōMI");
    expect(SHARE_OG_DESCRIPTION).toBe("Know when you're ready. Move when it matters.");

    const og = defaultShareOpenGraph();
    expect(og.title).toBe("HōMI");
    expect(og.description).toBe("Know when you're ready. Move when it matters.");
    expect(og.images).toEqual([
      { url: "/og-v2.png", width: 1200, height: 630, alt: SHARE_OG_IMAGE.alt },
    ]);

    const twitter = defaultShareTwitter();
    expect(twitter.title).toBe("HōMI");
    expect(twitter.description).toBe("Know when you're ready. Move when it matters.");
    expect(twitter.images).toEqual([
      {
        url: "/twitter-v2.png",
        width: 1200,
        height: 600,
        alt: SHARE_TWITTER_IMAGE.alt,
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

  it("does not rewrite ranking HTML titles on this branch", () => {
    const layout = readFileSync(join(APP, "layout.tsx"), "utf8");
    const home = readFileSync(join(APP, "(marketing)/page.tsx"), "utf8");
    expect(layout).toContain('default: "HōMI · Decision Readiness Intelligence™"');
    expect(home).toContain('title: "Know When You\'re Ready — Decision Readiness Intelligence™"');
  });
});
