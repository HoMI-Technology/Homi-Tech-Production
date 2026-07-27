/**
 * Path export — markdown + JSON for user download / partner share.
 */

import { bindingConstraintLabel, type ReadinessPath } from "./path";
import { PATH_LEGAL_SHORT, CERTIFICATE_LEGAL } from "./legal";
import { pathCompletionRatio } from "./progress";

export function exportPathMarkdown(path: ReadinessPath): string {
  const lines: string[] = [
    `# Path to Ready`,
    ``,
    `- Generated: ${path.createdAt}`,
    `- Verdict: ${path.verdict}`,
    `- Score: ${path.score}`,
    `- Mode: ${path.mode}`,
    `- Binding: ${bindingConstraintLabel(path.bindingConstraint)}`,
    `- Confidence: ${path.confidence}`,
    `- Completion: ${Math.round(pathCompletionRatio(path) * 100)}%`,
    ``,
    `## Steps`,
    ``,
  ];
  path.steps.forEach((s, i) => {
    lines.push(
      `### ${i + 1}. ${s.title}`,
      `- Kind: ${s.kind}`,
      `- Status: ${s.status ?? "pending"}`,
      `- When: +${s.daysFromNow}d`,
      `- Open: ${s.href}`,
      s.fundingTarget != null
        ? `- Funding: $${s.fundingTarget} ${s.fundingLabel ?? ""}`
        : "",
      ``,
      s.notes,
      ``,
    );
  });
  lines.push(`## Disclaimer`, ``, path.disclaimer || PATH_LEGAL_SHORT, ``, CERTIFICATE_LEGAL);
  return lines.filter((l) => l !== undefined).join("\n");
}

export function exportPathJson(path: ReadinessPath): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      legal: CERTIFICATE_LEGAL,
      path,
    },
    null,
    2,
  );
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime: string,
): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
