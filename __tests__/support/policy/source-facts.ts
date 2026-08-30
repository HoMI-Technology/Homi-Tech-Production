/**
 * AST fact collector. Policy tests assert on identifiers, string literals,
 * import specifiers, and call/expression text — never whole-file regex.
 */
import {
  Node,
  SyntaxKind,
  type SourceFile,
} from "ts-morph";
import { repoPath, sourceFile } from "./project";
import type { SourceLockFact } from "./source-lock-facts";

export type FileFacts = {
  file: string;
  identifiers: Set<string>;
  strings: string[];
  imports: string[];
  codeTexts: string[];
};

function collect(sf: SourceFile): FileFacts {
  const identifiers = new Set<string>();
  const strings: string[] = [];
  const imports: string[] = [];
  const codeTexts: string[] = [];

  for (const decl of sf.getImportDeclarations()) {
    imports.push(decl.getModuleSpecifierValue());
  }

  for (const stmt of sf.getStatements()) {
    codeTexts.push(stmt.getText());
  }

  sf.forEachDescendant((node) => {
    if (Node.isIdentifier(node)) {
      identifiers.add(node.getText());
      return;
    }
    if (
      Node.isStringLiteral(node) ||
      Node.isNoSubstitutionTemplateLiteral(node)
    ) {
      strings.push(node.getLiteralValue());
      return;
    }
    if (Node.isJsxText(node)) {
      const text = node.getText().trim();
      if (text) strings.push(text);
      return;
    }
    if (
      Node.isCallExpression(node) ||
      Node.isPropertyAccessExpression(node) ||
      Node.isJsxAttribute(node) ||
      Node.isBinaryExpression(node)
    ) {
      codeTexts.push(node.getText());
    }
  });

  return { file: repoPath(sf), identifiers, strings, imports, codeTexts };
}

const factsCache = new Map<string, FileFacts>();

export function fileFacts(rel: string): FileFacts {
  const hit = factsCache.get(rel);
  if (hit) return hit;
  const next = collect(sourceFile(rel));
  factsCache.set(rel, next);
  return next;
}

function haystack(facts: FileFacts): string {
  return [
    ...facts.identifiers,
    ...facts.strings,
    ...facts.imports,
    ...facts.codeTexts,
  ].join("\n");
}

function includesString(facts: FileFacts, needle: string): boolean {
  return (
    facts.identifiers.has(needle) ||
    facts.strings.some((s) => s.includes(needle)) ||
    facts.imports.some((s) => s.includes(needle)) ||
    facts.codeTexts.some((s) => s.includes(needle))
  );
}

export function evaluateFact(fact: SourceLockFact): string[] {
  const facts = fileFacts(fact.file);
  const hay = haystack(facts);
  const offenders: string[] = [];

  for (const id of fact.identifiersMust ?? []) {
    if (!facts.identifiers.has(id)) {
      offenders.push(`identifiersMust missing ${id}`);
    }
  }
  for (const id of fact.identifiersMustNot ?? []) {
    if (facts.identifiers.has(id)) {
      offenders.push(`identifiersMustNot present ${id}`);
    }
  }
  for (const s of fact.stringsMust ?? []) {
    if (!facts.strings.some((v) => v.includes(s)) && !includesString(facts, s)) {
      offenders.push(`stringsMust missing ${JSON.stringify(s)}`);
    }
  }
  for (const s of fact.stringsMustNot ?? []) {
    if (includesString(facts, s)) {
      offenders.push(`stringsMustNot present ${JSON.stringify(s)}`);
    }
  }
  for (const spec of fact.importsMust ?? []) {
    if (!facts.imports.some((v) => v.includes(spec))) {
      offenders.push(`importsMust missing ${spec}`);
    }
  }
  for (const spec of fact.importsMustNot ?? []) {
    if (facts.imports.some((v) => v.includes(spec))) {
      offenders.push(`importsMustNot present ${spec}`);
    }
  }
  for (const frag of fact.codeMust ?? []) {
    if (!includesString(facts, frag)) {
      offenders.push(`codeMust missing ${JSON.stringify(frag)}`);
    }
  }
  for (const frag of fact.codeMustNot ?? []) {
    if (includesString(facts, frag)) {
      offenders.push(`codeMustNot present ${JSON.stringify(frag)}`);
    }
  }
  for (const src of fact.codeMustMatch ?? []) {
    if (!new RegExp(src).test(hay) && !new RegExp(src).test(facts.codeTexts.join("\n"))) {
      offenders.push(`codeMustMatch failed /${src}/`);
    }
  }
  for (const src of fact.codeMustNotMatch ?? []) {
    if (new RegExp(src).test(hay)) {
      offenders.push(`codeMustNotMatch hit /${src}/`);
    }
  }

  return offenders;
}

export function stringLiteralsIn(
  rel: string,
  kinds: SyntaxKind[] = [
    SyntaxKind.StringLiteral,
    SyntaxKind.NoSubstitutionTemplateLiteral,
    SyntaxKind.JsxText,
    SyntaxKind.TemplateHead,
    SyntaxKind.TemplateMiddle,
    SyntaxKind.TemplateTail,
  ],
): Array<{ line: number; text: string }> {
  const sf = sourceFile(rel);
  const out: Array<{ line: number; text: string }> = [];
  for (const kind of kinds) {
    for (const node of sf.getDescendantsOfKind(kind)) {
      const text = Node.isJsxText(node)
        ? node.getText()
        : "getLiteralValue" in node
          ? String((node as { getLiteralValue: () => string }).getLiteralValue?.() ?? node.getText())
          : node.getText();
      out.push({ line: node.getStartLineNumber(), text });
    }
  }
  return out;
}
