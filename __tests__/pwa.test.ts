import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import manifest from "@/app/manifest";

/**
 * PWA contract tests
 * ==================
 *
 * The service worker's install step is `cache.addAll(PRECACHE_URLS)` — if any
 * precached file goes missing, install rejects and the PWA silently stops
 * updating for every user. These tests keep the manifest, the precache list,
 * and the files in /public from drifting apart.
 */

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const SW_SOURCE = fs.readFileSync(path.join(PUBLIC_DIR, "sw.js"), "utf8");

function publicFileExists(urlPath: string): boolean {
  return fs.existsSync(path.join(PUBLIC_DIR, urlPath.replace(/^\//, "")));
}

describe("web app manifest", () => {
  const m = manifest();

  it("has a stable install identity", () => {
    expect(m.id).toBe("/");
    expect(m.scope).toBe("/");
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
  });

  it("uses the locked brand palette", () => {
    expect(m.theme_color).toBe("#0a1628");
    expect(m.background_color).toBe("#0a1628");
  });

  it("declares 192px, 512px, and a dedicated maskable icon", () => {
    const icons = m.icons ?? [];
    expect(icons.some((i) => i.sizes === "192x192")).toBe(true);
    expect(icons.some((i) => i.sizes === "512x512")).toBe(true);
    const maskable = icons.filter((i) => i.purpose === "maskable");
    expect(maskable.length).toBeGreaterThan(0);
    // The default icon has transparent rounded corners; maskable must be a
    // dedicated full-bleed asset, never the same file as the "any" icon.
    const anySrcs = new Set(icons.filter((i) => i.purpose !== "maskable").map((i) => i.src));
    for (const icon of maskable) expect(anySrcs.has(icon.src)).toBe(false);
  });

  it("only references icon files that exist in /public", () => {
    for (const icon of m.icons ?? []) {
      expect(publicFileExists(icon.src), `${icon.src} missing from /public`).toBe(true);
    }
  });
});

describe("service worker", () => {
  it("exists alongside its offline fallback", () => {
    expect(publicFileExists("/sw.js")).toBe(true);
    expect(publicFileExists("/offline.html")).toBe(true);
  });

  it("precaches only files that exist in /public", () => {
    // PRECACHE_URLS mixes quoted paths and the OFFLINE_URL constant.
    const offline = SW_SOURCE.match(/const OFFLINE_URL = "(\/[^"]+)";/);
    expect(offline, "OFFLINE_URL const not found in sw.js").not.toBeNull();
    const block = SW_SOURCE.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);
    expect(block, "PRECACHE_URLS block not found in sw.js").not.toBeNull();
    const urls = [...block![1].matchAll(/"(\/[^"]+)"/g)].map((m) => m[1]);
    if (block![1].includes("OFFLINE_URL")) urls.push(offline![1]);
    expect(urls).toContain("/offline.html");
    for (const url of urls) {
      expect(publicFileExists(url), `${url} precached but missing from /public`).toBe(true);
    }
  });

  it("never intercepts API or auth routes", () => {
    expect(SW_SOURCE).toContain('url.pathname.startsWith("/api/")');
    expect(SW_SOURCE).toContain('url.pathname.startsWith("/auth/")');
  });
});

describe("middleware", () => {
  it("excludes the service worker and offline page from the auth matcher", () => {
    const source = fs.readFileSync(path.join(ROOT, "middleware.ts"), "utf8");
    // The matcher is a string literal in TS source, so the dot is escaped
    // with a double backslash there.
    expect(source).toContain(String.raw`sw\\.js`);
    expect(source).toContain(String.raw`offline\\.html`);
  });
});
