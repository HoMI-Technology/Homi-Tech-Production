/**
 * TEMPORARY, single-use. Mechanical `tnum` -> `num` sweep.
 *
 * On any line carrying the `tnum` marker, the class list is a numeric value
 * slot. `.num` supersedes `font-display tnum` outright: it sets the JetBrains
 * Mono score face plus tabular + slashed-zero figures, so the Fraunces
 * `font-display` token on that same slot must go or it wins the family (it is
 * a Tailwind utility; `.num` lives in @layer components).
 *
 * Delete this file once the sweep is committed.
 */
import fs from "node:fs";

const FILES = process.argv.slice(2);
let touched = 0;

for (const file of FILES) {
  const before = fs.readFileSync(file, "utf8");
  const after = before
    .split("\n")
    .map((line) => {
      if (!/\btnum\b/.test(line)) return line;
      return line.replace(/\bfont-display\s+/g, "").replace(/\btnum\b/g, "num");
    })
    .join("\n");
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    touched += 1;
    console.log(`swept ${file}`);
  }
}
console.log(`${touched} file(s) changed`);
