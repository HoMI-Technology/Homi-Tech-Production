from pathlib import Path
p = Path(r"lib/readiness/path.ts")
text = p.read_text(encoding="utf-8")
# normalize weird indentation of spread
text = text.replace("\n        ...pendingFields(),", "\n        ...pendingFields(),")
# already ok-ish; fix double-indent cases with 8 spaces before ...
import re
text = re.sub(r"\n\s+\.\.\.pendingFields\(\),", "\n        ...pendingFields(),", text)
p.write_text(text, encoding="utf-8")
print("ok")
