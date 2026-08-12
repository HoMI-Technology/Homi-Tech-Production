import fs from "node:fs";

const p = "lib/admin/marketing-agency.ts";
let buf = fs.readFileSync(p);

// Double-encoded ō (U+014D): UTF-8 C5 8D re-encoded as C3 85 C2 8D
// HōMI was written as H + that sequence + MI
const bad = Buffer.from([0xc3, 0x85, 0xc2, 0x8d]); // mojibake of ō
const good = Buffer.from([0xc5, 0x8d]); // real ō

let t = buf.toString("binary");
const badBin = bad.toString("binary");
const goodBin = good.toString("binary");
const count = t.split(badBin).length - 1;
t = t.split(badBin).join(goodBin);

// Also classic mojibake strings in utf8 text domain
let utf = Buffer.from(t, "binary").toString("utf8");
const pairs = [
  ["â€”", "—"],
  ["â€“", "–"],
  ["â€¦", "…"],
  ["â€œ", "“"],
  ["â€\u009d", "”"],
  ["â€™", "’"],
  ["â€˜", "‘"],
  ["â‰ ", "≠"],
  ["â‰ ", "≠ "],
  ["Â·", "·"],
  ["HÅMI", "HōMI"],
  ["Afford ≠ready", "Afford ≠ ready"],
];
for (const [a, b] of pairs) utf = utf.split(a).join(b);
utf = utf.replace(/\uFFFD/g, "·");
utf = utf.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

fs.writeFileSync(p, utf, "utf8");

const checks = {
  replacedO: count,
  homi: (utf.match(/HōMI/g) || []).length,
  scorecard: utf.includes("## HōMI Weekly Scorecard — WEEK ending"),
  afford: utf.includes("Afford ≠ ready"),
  cal: utf.includes("${day} · ${slotLabel"),
  mojibake: (utf.match(/â€|Â·|â‰|HÅ/g) || []).length,
};
console.log(checks);
if (!checks.scorecard || !checks.afford || !checks.cal || checks.mojibake) process.exit(2);
