/**
 * Locks docs/audit/dashboard-surface-matrix.md to the shipped V4 allow-list.
 * Drives keep-routes constants — does not copy V4_PENDING_PATHS into a second list.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  classifyChangeControlLane,
  isV4HomeEnabled,
  isV4RouteActivated,
  V4_LIVE_PATHS,
  V4_PENDING_PATHS,
} from "@/lib/auth/keep-routes";

const MATRIX_PATH = resolve(process.cwd(), "docs/audit/dashboard-surface-matrix.md");
const PIXEL_PATH = resolve(process.cwd(), "docs/design/v4-screenshot-set.md");

const STATUSES = ["HONEST", "STAY-DRAFT", "BLOCKED", "DARK", "OUT"] as const;
const TERMINALS = [
  "merged",
  "stay-draft",
  "planned-not-built",
  "missing",
  "blocked",
] as const;
const CORE_RESULTS = [
  "PASS",
  "FAIL",
  "SKIPPED",
  "NOT CONFIGURED",
  "BLOCKED",
] as const;

type MatrixRow = {
  host: string;
  status: string;
  terminal: string;
  note: string;
};

function readMatrix(): string {
  return readFileSync(MATRIX_PATH, "utf8");
}

function parseMatrixTable(md: string, marker: string): MatrixRow[] {
  const startTag = `<!-- dashboard-matrix:${marker} -->`;
  const start = md.indexOf(startTag);
  expect(start, `missing ${startTag}`).toBeGreaterThanOrEqual(0);
  const rest = md.slice(start + startTag.length);
  const next = rest.search(/<!-- dashboard-matrix:/);
  const body = next >= 0 ? rest.slice(0, next) : rest;
  const rows: MatrixRow[] = [];
  for (const line of body.split("\n")) {
    if (!line.startsWith("|")) continue;
    const parts = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (parts.length < 4) continue;
    if (parts[0] === "Host") continue;
    if (/^:?-{3,}:?$/.test(parts[0])) continue;
    rows.push({
      host: parts[0].replace(/`/g, ""),
      status: parts[1],
      terminal: parts[2],
      note: parts.slice(3).join(" | "),
    });
  }
  return rows;
}

type CoreRow = { check: string; result: string };

function parseCoreTable(md: string): CoreRow[] {
  const startTag = "<!-- dashboard-matrix:core -->";
  const start = md.indexOf(startTag);
  expect(start, "missing core marker").toBeGreaterThanOrEqual(0);
  const rest = md.slice(start + startTag.length);
  const next = rest.search(/<!-- dashboard-matrix:/);
  const body = next >= 0 ? rest.slice(0, next) : rest;
  const rows: CoreRow[] = [];
  for (const line of body.split("\n")) {
    if (!line.startsWith("|")) continue;
    const parts = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (parts.length < 2) continue;
    if (parts[0] === "Check") continue;
    if (/^:?-{3,}:?$/.test(parts[0])) continue;
    rows.push({ check: parts[0].replace(/`/g, ""), result: parts[1] });
  }
  return rows;
}

describe("dashboard surface matrix", () => {
  it("keeps CCP lanes: DARK /dashboard, empty V4_LIVE, no /team, flag default-off", () => {
    expect(classifyChangeControlLane("/dashboard")).toBe("DARK");
    expect(classifyChangeControlLane("/team")).toBe("DARK");
    expect(V4_LIVE_PATHS).toEqual([]);
    expect((V4_PENDING_PATHS as readonly string[]).includes("/team")).toBe(false);
    expect(isV4HomeEnabled({})).toBe(false);
    expect(isV4RouteActivated("/home", { v4HomeEnabled: false })).toBe(false);
  });

  it("lists every shipped V4_PENDING host with legal Status and Terminal", () => {
    const md = readMatrix();
    const pending = parseMatrixTable(md, "pending");
    const byHost = new Map(pending.map((row) => [row.host, row]));

    expect(pending.map((row) => row.host)).toEqual([...V4_PENDING_PATHS]);

    for (const host of V4_PENDING_PATHS) {
      const row = byHost.get(host);
      expect(row, `missing matrix row for ${host}`).toBeTruthy();
      if (!row) continue;
      expect(STATUSES, `${host} Status`).toContain(row.status);
      expect(TERMINALS, `${host} Terminal`).toContain(row.terminal);
      expect(row.status).not.toBe("DARK");
      expect(row.status).not.toBe("OUT");
      if (row.status !== "HONEST") {
        const namedPr = /PR\s*#\d+/.test(row.note);
        const blockedReason = /BLOCKED:/i.test(row.note);
        expect(
          namedPr || blockedReason,
          `${host} non-HONEST row needs PR #<n> or BLOCKED: reason`,
        ).toBe(true);
      }
    }
  });

  it("marks /dashboard and /team DARK and keeps forbidden work OUT", () => {
    const md = readMatrix();
    const related = parseMatrixTable(md, "related");
    const out = parseMatrixTable(md, "out");
    const relatedByHost = new Map(related.map((row) => [row.host, row]));

    for (const host of ["/dashboard", "/team"] as const) {
      const row = relatedByHost.get(host);
      expect(row, `missing related row for ${host}`).toBeTruthy();
      expect(row?.status).toBe("DARK");
      expect(row?.terminal).toBe("blocked");
      expect(classifyChangeControlLane(host)).toBe("DARK");
    }

    const outBlob = out.map((row) => `${row.host} ${row.note}`).join("\n");
    expect(out.every((row) => row.status === "OUT")).toBe(true);
    expect(outBlob).toMatch(/cursor\/pr-c-shell-home-v4-2905/);
    expect(outBlob).toMatch(/HOMI_V4_HOME_ENABLED/);
    expect(outBlob).toMatch(/V4_LIVE/);
    expect(outBlob).toMatch(/#241/);
    expect(outBlob).toMatch(/#414/);
    expect(outBlob.toLowerCase()).toMatch(/rebuild/);
  });

  it("keeps Pixel Gate CLOSED and records CORE without forcing FULL", () => {
    const md = readMatrix();
    const pixel = readFileSync(PIXEL_PATH, "utf8");
    expect(md).toMatch(/\*\*Status: CLOSED\.\*\*/);
    expect(md).toMatch(/APPROVE VISUAL DIRECTION/);
    expect(md).toMatch(/<!-- dashboard-matrix:core -->/);
    expect(md).toMatch(/TEST_COVERAGE_MODE=(CORE|FULL)/);
    expect(md).not.toMatch(/PLACEHOLDER/);
    expect(md).toMatch(/#241/);
    expect(pixel).toMatch(/APPROVE VISUAL DIRECTION/);
    expect(pixel).toMatch(
      /Do not set `HOMI_V4_HOME_ENABLED=true` on Production from this gate/,
    );
    expect(pixel).toMatch(/This PR does not\s+flip Pixel Gate/);

    const core = parseCoreTable(md);
    expect(core.length).toBeGreaterThan(0);
    const checks = core.map((row) => row.check).join("\n");
    expect(checks).toMatch(/CORE_E2E/);
    expect(checks).toMatch(/INTEGRATION_E2E_SUPABASE/);
    expect(checks).toMatch(/INTEGRATION_E2E_STRIPE/);
    expect(checks).toMatch(/AUTHENTICATED_LIGHTHOUSE/);
    expect(checks).toMatch(/verify/);
    expect(checks).toMatch(/e2e/i);
    expect(checks).toMatch(/#241/);
    for (const row of core) {
      expect(CORE_RESULTS, `${row.check} Result`).toContain(row.result);
    }
    const liveHold = core.find((row) => /#241/.test(row.check));
    expect(liveHold, "CORE table must name live E2E under #241").toBeTruthy();
    expect(liveHold?.result).not.toBe("FAIL");
    expect(["SKIPPED", "NOT CONFIGURED"]).toContain(liveHold?.result);
  });
});
