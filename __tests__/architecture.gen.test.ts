/**
 * Generates public/architecture.json when ARCHITECTURE_WRITE=1.
 * npm run architecture:gen → sets the flag and runs this file via vitest.
 */

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildArchitectureDocument,
  serializeArchitectureDocument,
} from "@/lib/architecture";

const ROOT = process.cwd();

function walkFiles(dir: string, predicate: (name: string) => boolean, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, predicate, acc);
    else if (predicate(entry.name)) acc.push(full);
  }
  return acc;
}

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

function pagePathFromFile(file: string): string | null {
  const rel = toPosix(path.relative(path.join(ROOT, "app"), file));
  if (!rel.endsWith("/page.tsx") && rel !== "page.tsx") return null;
  const withoutPage = rel.replace(/\/page\.tsx$/, "").replace(/^page\.tsx$/, "");
  const parts = withoutPage.split("/").filter((p) => p && !p.startsWith("("));
  if (parts.length === 0) return "/";
  return `/${parts.join("/")}`;
}

function scanProductRoutes(): Array<{ path: string; file: string }> {
  const pages = walkFiles(path.join(ROOT, "app"), (n) => n === "page.tsx");
  const seen = new Map<string, string>();
  for (const file of pages) {
    const routePath = pagePathFromFile(file);
    if (!routePath) continue;
    const rel = toPosix(path.relative(ROOT, file));
    if (!seen.has(routePath)) seen.set(routePath, rel);
  }
  return [...seen.entries()]
    .map(([p, file]) => ({ path: p, file }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function scanApiDirs(): string[] {
  const apiRoot = path.join(ROOT, "app", "api");
  return readdirSync(apiRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function scanComponentDirs(): Array<{ name: string; count: number; examples: string[] }> {
  const componentsRoot = path.join(ROOT, "components");
  return readdirSync(componentsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const files = walkFiles(path.join(componentsRoot, d.name), (n) => /\.(tsx|ts|jsx|js)$/.test(n));
      const examples = files
        .map((f) => path.basename(f, path.extname(f)))
        .filter((n) => n !== "index")
        .slice(0, 5);
      return { name: d.name, count: files.length, examples };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function scanLibModules(): Array<{ name: string; purpose: string }> {
  const libRoot = path.join(ROOT, "lib");
  const modules: Array<{ name: string; purpose: string }> = [];
  for (const entry of readdirSync(libRoot, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isDirectory()) {
      modules.push({ name: entry.name, purpose: `${entry.name} domain module` });
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      modules.push({ name: entry.name.replace(/\.(ts|tsx)$/, ""), purpose: `${entry.name} helper` });
    }
  }
  return modules.sort((a, b) => a.name.localeCompare(b.name));
}

function countMigrations(): number {
  const dir = path.join(ROOT, "supabase", "migrations");
  try {
    return readdirSync(dir).filter((f) => f.endsWith(".sql")).length;
  } catch {
    return 0;
  }
}

describe("architecture.json generation", () => {
  it("writes public/architecture.json when ARCHITECTURE_WRITE=1", () => {
    if (process.env.ARCHITECTURE_WRITE !== "1") {
      expect(true).toBe(true);
      return;
    }

    const doc = buildArchitectureDocument({
      productRoutes: scanProductRoutes(),
      apiRouteDirs: scanApiDirs(),
      componentDirs: scanComponentDirs(),
      libModules: scanLibModules(),
      migrationCount: countMigrations(),
      generated: new Date().toISOString().slice(0, 10),
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://homitechnology.com",
    });

    const outDir = path.join(ROOT, "public");
    mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, "architecture.json");
    const payload = serializeArchitectureDocument(doc);
    writeFileSync(outPath, payload, "utf8");

    expect(statSync(outPath).size).toBeGreaterThan(1000);
    expect(JSON.parse(readFileSync(outPath, "utf8")).ai_agents.find((a: { id: string }) => a.id === "oracle").level).toBe(10);
  });
});
