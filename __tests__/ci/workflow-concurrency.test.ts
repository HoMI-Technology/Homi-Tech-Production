import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

/**
 * Regression guard for GitHub Actions concurrency controls.
 *
 * Lighthouse is the most expensive workflow in the repo (~7 min/run). Without a
 * concurrency group, every superseded push left an obsolete run billing Actions
 * minutes against a commit nobody would merge. This suite fails CI if that
 * protection is deleted or weakened — the group must exist, it must cancel
 * superseded runs, and it must NEVER cancel runs on main.
 *
 * The assertions evaluate the workflow expressions rather than string-matching
 * them, so a rewrite that keeps the words but breaks the behavior still fails.
 */

const workflowPath = (file: string) =>
  fileURLToPath(new URL(`../../.github/workflows/${file}`, import.meta.url));

const readWorkflow = (file: string) => readFileSync(workflowPath(file), "utf8");

// --- Minimal GitHub Actions expression evaluator -------------------------
//
// Supports exactly the syntax these workflows use: `||`, `&&`, `==`, `!=`,
// single-quoted string literals, and dotted context paths. Anything else
// throws, which fails the test loudly — an expression this evaluator cannot
// verify is an expression no one has proven safe for main.

type Ctx = Record<string, unknown>;
type Value = string | number | boolean | undefined;

const truthy = (v: Value): boolean => v !== undefined && v !== false && v !== "" && v !== 0;

/** Splits on a top-level operator, ignoring anything inside quotes. */
function splitTop(expr: string, op: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let quoted = false;
  let start = 0;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "'") quoted = !quoted;
    else if (!quoted && ch === "(") depth++;
    else if (!quoted && ch === ")") depth--;
    else if (!quoted && depth === 0 && expr.startsWith(op, i)) {
      parts.push(expr.slice(start, i));
      i += op.length - 1;
      start = i + 1;
    }
  }
  parts.push(expr.slice(start));
  return parts;
}

function lookup(path: string, ctx: Ctx): Value {
  let cur: unknown = ctx;
  for (const key of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  if (cur === undefined || cur === null) return undefined;
  if (typeof cur === "object") throw new Error(`context path "${path}" is not a scalar`);
  return cur as Value;
}

function evaluate(expr: string, ctx: Ctx): Value {
  const src = expr.trim();

  const ors = splitTop(src, "||");
  if (ors.length > 1) {
    // GitHub's `||` yields the first truthy operand's VALUE, not a boolean.
    for (const part of ors.slice(0, -1)) {
      const v = evaluate(part, ctx);
      if (truthy(v)) return v;
    }
    return evaluate(ors[ors.length - 1], ctx);
  }

  const ands = splitTop(src, "&&");
  if (ands.length > 1) {
    let last: Value = true;
    for (const part of ands) {
      last = evaluate(part, ctx);
      if (!truthy(last)) return last;
    }
    return last;
  }

  for (const op of ["!=", "=="] as const) {
    const sides = splitTop(src, op);
    if (sides.length === 2) {
      const left = evaluate(sides[0], ctx);
      const right = evaluate(sides[1], ctx);
      return op === "==" ? left === right : left !== right;
    }
  }

  if (src.startsWith("(") && src.endsWith(")")) return evaluate(src.slice(1, -1), ctx);
  if (/^'[^']*'$/.test(src)) return src.slice(1, -1);
  if (src === "true") return true;
  if (src === "false") return false;
  if (/^[A-Za-z_][\w.-]*$/.test(src)) return lookup(src, ctx);

  throw new Error(`unsupported workflow expression: ${JSON.stringify(src)}`);
}

/** Renders a value that may be a bare `${{ … }}` expression or a template. */
function render(raw: unknown, ctx: Ctx): Value {
  if (typeof raw !== "string") return raw as Value;
  const whole = raw.match(/^\$\{\{(.+)\}\}$/s);
  if (whole) return evaluate(whole[1], ctx);
  return raw.replace(/\$\{\{(.+?)\}\}/gs, (_m, inner: string) =>
    String(evaluate(inner, ctx) ?? ""),
  );
}

// --- Event contexts ------------------------------------------------------

const prCtx = (number: number, workflow: string): Ctx => ({
  github: {
    workflow,
    ref: `refs/pull/${number}/merge`,
    event: { pull_request: { number } },
  },
});

const branchCtx = (branch: string, workflow: string): Ctx => ({
  github: { workflow, ref: `refs/heads/${branch}`, event: {} },
});

type Concurrency = { group?: unknown; "cancel-in-progress"?: unknown };

function concurrencyOf(file: string): Concurrency {
  const doc = parse(readWorkflow(file)) as { concurrency?: Concurrency };
  expect(doc.concurrency, `${file} must declare a top-level concurrency block`).toBeTruthy();
  return doc.concurrency as Concurrency;
}

// --- Lighthouse: the protection that must never regress ------------------

describe("lighthouse.yml concurrency protection", () => {
  const FILE = "lighthouse.yml";
  const WORKFLOW = "Lighthouse";

  it("is valid YAML", () => {
    expect(() => parse(readWorkflow(FILE))).not.toThrow();
    const doc = parse(readWorkflow(FILE)) as Record<string, unknown>;
    expect(doc).toBeTypeOf("object");
    expect(doc.name).toBe(WORKFLOW);
  });

  it("declares a concurrency group", () => {
    const group = concurrencyOf(FILE).group;
    expect(typeof group).toBe("string");
    expect((group as string).trim()).not.toBe("");
    // A constant group would serialize every branch behind one lane.
    expect(group as string).toContain("${{");
  });

  it("declares cancel-in-progress", () => {
    const cancel = concurrencyOf(FILE)["cancel-in-progress"];
    expect(cancel, "cancel-in-progress must be present").toBeDefined();
    expect(cancel === true || typeof cancel === "string").toBe(true);
  });

  it("cancels superseded runs on pull requests and feature branches", () => {
    const cancel = concurrencyOf(FILE)["cancel-in-progress"];
    expect(render(cancel, prCtx(12, WORKFLOW))).toBe(true);
    expect(render(cancel, branchCtx("feat/premium-hero", WORKFLOW))).toBe(true);
  });

  it("NEVER cancels runs on main", () => {
    const cancel = concurrencyOf(FILE)["cancel-in-progress"];
    expect(
      render(cancel, branchCtx("main", WORKFLOW)),
      "main runs are the post-merge validation record and must always finish",
    ).toBe(false);
  });

  it("gives each pull request its own lane", () => {
    const group = concurrencyOf(FILE).group;
    const pr12 = render(group, prCtx(12, WORKFLOW));
    const pr12Again = render(group, prCtx(12, WORKFLOW));
    const pr13 = render(group, prCtx(13, WORKFLOW));

    expect(pr12).toBe(pr12Again); // a newer push to PR #12 supersedes the old run
    expect(pr12).not.toBe(pr13); // …but never touches PR #13
  });

  it("keeps manual runs on different branches in separate lanes", () => {
    const group = concurrencyOf(FILE).group;
    const featX = render(group, branchCtx("feat/x", WORKFLOW));
    const featY = render(group, branchCtx("feat/y", WORKFLOW));
    const main = render(group, branchCtx("main", WORKFLOW));

    expect(featX).not.toBe(featY);
    expect(featX).not.toBe(main);
    expect(render(group, branchCtx("feat/x", WORKFLOW))).toBe(featX);
  });

  it("keeps Lighthouse enabled", () => {
    const doc = parse(readWorkflow(FILE)) as {
      jobs?: Record<string, { if?: unknown; steps?: { run?: string }[] }>;
    };
    const job = doc.jobs?.lighthouse;
    expect(job, "the lighthouse job must still exist").toBeTruthy();
    // A blanket `if: false` would disable the workflow while leaving it "present".
    expect(job?.if).toBeUndefined();
    const runs = (job?.steps ?? []).map((s) => s.run ?? "").join("\n");
    expect(runs).toContain("lhci autorun");
  });
});

// --- The same guarantees for the other expensive workflows ---------------

describe.each([
  ["ci.yml", "CI"],
  ["e2e.yml", "E2E"],
])("%s concurrency protection", (file, workflow) => {
  it("declares a per-ref concurrency group", () => {
    const group = concurrencyOf(file).group;
    expect(typeof group).toBe("string");
    expect(group as string).toContain("${{");
    expect(render(group, prCtx(12, workflow))).not.toBe(render(group, prCtx(13, workflow)));
  });

  it("cancels superseded runs but never cancels main", () => {
    const cancel = concurrencyOf(file)["cancel-in-progress"];
    expect(cancel).toBeDefined();
    expect(render(cancel, prCtx(12, workflow))).toBe(true);
    expect(render(cancel, branchCtx("main", workflow))).toBe(false);
  });
});

// --- Every workflow stays parseable and bounded --------------------------

describe("workflow hygiene", () => {
  const FILES = ["ci.yml", "e2e.yml", "lighthouse.yml"];

  it.each(FILES)("%s is valid YAML", (file) => {
    expect(() => parse(readWorkflow(file))).not.toThrow();
  });

  it.each(FILES)("%s bounds every job with timeout-minutes", (file) => {
    const doc = parse(readWorkflow(file)) as {
      jobs?: Record<string, { "timeout-minutes"?: unknown }>;
    };
    const jobs = Object.entries(doc.jobs ?? {});
    expect(jobs.length).toBeGreaterThan(0);
    for (const [name, job] of jobs) {
      expect(job["timeout-minutes"], `${file}:${name} needs timeout-minutes`).toBeTypeOf("number");
    }
  });

  it("requires code-owner review for workflow changes", () => {
    const codeowners = readFileSync(
      fileURLToPath(new URL("../../.github/CODEOWNERS", import.meta.url)),
      "utf8",
    );
    const rules = codeowners
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));
    const workflowRule = rules.find((l) => l.startsWith("/.github/workflows/"));
    expect(workflowRule, "CODEOWNERS must cover /.github/workflows/").toBeTruthy();
    expect(workflowRule).toMatch(/@\S+/);
  });
});
