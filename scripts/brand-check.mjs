#!/usr/bin/env node
/**
 * HōMI brand-check
 * =================
 *
 * Scans app/, components/, lib/ for:
 *   - Misspelled brand casing (\bHoMI\b, \bHOMI\b — except inside the legal
 *     entity name "HOMI TECHNOLOGIES").
 *   - Forbidden marketing words (hype, guarantees, etc.).
 *   - Banned hex colors that aren't part of the locked palette.
 *
 * Reports `file:line  message` for every violation and exits 1 if any are
 * found. A line can be suppressed by adding `/* brand-ok *\/` on that same
 * line — intended for comments, fixtures, or intentional negative examples
 * (e.g. "never write X"), not for real user-facing copy.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SCAN_DIRS = ["app", "components", "lib"];
const EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".css"]);
const SUPPRESSION = "brand-ok";

const FORBIDDEN_WORDS = [
  "AI-powered",
  "revolutionary",
  "game-changing",
  "dream home",
  "pre-approval",
  "world-class",
  "best-in-class",
  "cutting-edge",
  "disrupting",
  "guaranteed",
  "bank-level",
];

const BANNED_HEXES = ["#fb923c", "#ef4444"];

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const FORBIDDEN_WORD_PATTERNS = FORBIDDEN_WORDS.map((word) => ({
  word,
  re: new RegExp(`\\b${escapeRegExp(word)}\\b`, "i"),
}));

function walk(dir, files = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

function isSuppressed(line) {
  return line.includes(SUPPRESSION);
}

function checkLine(filePath, lineNumber, line, violations) {
  if (isSuppressed(line)) return;

  // Misspelled brand casing: "HoMI" is always wrong.
  if (/\bHoMI\b/.test(line)) {
    violations.push({
      file: filePath,
      line: lineNumber,
      message: 'Misspelled brand name "HoMI" — use "HōMI" (U+014D).',
    });
  }

  // "HOMI" is wrong except as part of the legal entity name.
  const withoutLegalEntity = line.replace(/HOMI TECHNOLOGIES/g, "");
  if (/\bHOMI\b/.test(withoutLegalEntity)) {
    violations.push({
      file: filePath,
      line: lineNumber,
      message: 'Misspelled brand name "HOMI" — use "HōMI" (U+014D).',
    });
  }

  for (const { word, re } of FORBIDDEN_WORD_PATTERNS) {
    if (re.test(line)) {
      violations.push({ file: filePath, line: lineNumber, message: `Forbidden word "${word}".` });
    }
  }

  const lowerLine = line.toLowerCase();
  for (const hex of BANNED_HEXES) {
    if (lowerLine.includes(hex)) {
      violations.push({ file: filePath, line: lineNumber, message: `Banned color ${hex}.` });
    }
  }
}

function main() {
  const violations = [];

  for (const dir of SCAN_DIRS) {
    const full = path.join(ROOT, dir);
    const files = walk(full);
    for (const file of files) {
      let content;
      try {
        content = fs.readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const lines = content.split("\n");
      lines.forEach((line, idx) => checkLine(file, idx + 1, line, violations));
    }
  }

  if (violations.length > 0) {
    console.error(`brand-check: ${violations.length} violation(s) found\n`);
    for (const v of violations) {
      console.error(`${path.relative(ROOT, v.file)}:${v.line}  ${v.message}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("brand-check: clean — no violations found.");
  process.exitCode = 0;
}

main();
