import os

journal_path = ".jules/palette.md"

entry = """
## 2024-07-27 - Remove native title from buttons when wrapping in Tooltips
**Learning:** Adding a Radix UI `<Tooltip>` component to a button but forgetting to remove its native HTML `title` attribute results in a double-tooltip effect where the browser's default tooltip overlaps the custom styled one.
**Action:** Always verify that native `title` attributes are completely removed from the DOM node when replacing them with custom accessible `<Tooltip>` components.
"""

with open(journal_path, "a") as f:
    f.write(entry)
