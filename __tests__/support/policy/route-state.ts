/**
 * Filesystem + AST helper for route-state-coverage.
 * existsSync for sibling files; fetching detected via identifiers.
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { SyntaxKind } from "ts-morph";
import { listSourceFiles, repoPath } from "./project";

const FETCH_IDS = new Set([
  "fetch",
  "createClient",
  "createAdminClient",
  "getCachedUser",
  "supabase",
]);

export function fetchingPagesMissingState(): string[] {
  const missing: string[] = [];
  for (const sf of listSourceFiles("app")) {
    const rel = repoPath(sf);
    if (!rel.endsWith("page.tsx")) continue;
    const fetching = sf
      .getDescendantsOfKind(SyntaxKind.Identifier)
      .some((id) => FETCH_IDS.has(id.getText()));
    if (!fetching) continue;
    const dir = dirname(sf.getFilePath());
    const hasL = existsSync(join(dir, "loading.tsx"));
    const hasE = existsSync(join(dir, "error.tsx"));
    if (!hasL || !hasE) missing.push(rel);
  }
  return missing.sort();
}
