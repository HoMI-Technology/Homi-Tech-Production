from pathlib import Path
import re
p = Path(r"lib/readiness/path.ts")
text = p.read_text(encoding="utf-8")
text2 = re.sub(
    r"(fundingLabel: [^,\n]+,)(\n\s*\})",
    r"\1\n        ...pendingFields(),\2",
    text,
)
old = """    confidence,
    disclaimer: PATH_DISCLAIMER,
  };"""
new = """    confidence,
    disclaimer: PATH_DISCLAIMER,
    calendarCommittedAt: null,
  };"""
if old in text2:
    text2 = text2.replace(old, new, 1)
p.write_text(text2, encoding="utf-8")
print("pendingFields spreads", text2.count("...pendingFields()"))
print("has calendarCommittedAt in base", "calendarCommittedAt: null" in text2)
