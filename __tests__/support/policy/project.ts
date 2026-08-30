/**
 * Shared ts-morph Project for every T3 policy rule.
 * One instance per vitest worker — constructing per-rule blows the runtime budget.
 * readFileSync lives here only (CSS + source text for the AST helper).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Project, type SourceFile } from "ts-morph";

const ROOT = process.cwd();

const CACHE_KEY = "__homiPolicyProject" as const;

type Cache = {
  project: Project;
  byPath: Map<string, SourceFile>;
};

function posix(rel: string): string {
  return rel.replaceAll("\\", "/");
}

function load(): Cache {
  const project = new Project({
    tsConfigFilePath: resolve(ROOT, "tsconfig.json"),
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
  });
  project.addSourceFilesAtPaths([
    "app/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "lib/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "middleware.ts",
    "next.config.ts",
  ]);
  const byPath = new Map<string, SourceFile>();
  for (const sf of project.getSourceFiles()) {
    const rel = posix(sf.getFilePath().replace(`${ROOT}/`, ""));
    byPath.set(rel, sf);
  }
  return { project, byPath };
}

function cache(): Cache {
  const g = globalThis as typeof globalThis & { [CACHE_KEY]?: Cache };
  if (!g[CACHE_KEY]) g[CACHE_KEY] = load();
  return g[CACHE_KEY];
}

export function policyProject(): Project {
  return cache().project;
}

export function sourceFile(rel: string): SourceFile {
  const sf = cache().byPath.get(posix(rel));
  if (!sf) {
    throw new Error(`policy: source file not in project: ${rel}`);
  }
  return sf;
}

/** CSS / non-TS text. The only sanctioned readFileSync outside tests. */
export function readPolicyText(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

export function listSourceFiles(prefix: string): SourceFile[] {
  const needle = posix(prefix);
  return [...cache().byPath.entries()]
    .filter(([rel]) => rel.startsWith(needle) && /\.(ts|tsx)$/.test(rel))
    .map(([, sf]) => sf);
}

export function repoPath(sf: SourceFile): string {
  return posix(sf.getFilePath().replace(`${ROOT}/`, ""));
}
