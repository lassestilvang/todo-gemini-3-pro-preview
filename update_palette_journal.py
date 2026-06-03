import os
from datetime import datetime

journal_dir = ".jules"
journal_path = os.path.join(journal_dir, "palette.md")

if not os.path.exists(journal_dir):
    os.makedirs(journal_dir)

today = datetime.now().strftime("%Y-%m-%d")
entry = f"""## {today} - Always set type="button" on custom action buttons
**Learning:** Custom UI action buttons (like those used for filter removal or timer modes) can inadvertently cause form submissions or full-page reloads if they lack a `type` attribute, as the default HTML behavior for `<button>` is `type="submit"`.
**Action:** Always explicitly specify `type="button"` on custom `<button>` elements that act as standalone UI controls, unless they are intentionally designed to submit a form.
"""

if os.path.exists(journal_path):
    with open(journal_path, "a") as f:
        f.write("\n" + entry)
else:
    with open(journal_path, "w") as f:
        f.write(entry)

print("Journal updated successfully.")
