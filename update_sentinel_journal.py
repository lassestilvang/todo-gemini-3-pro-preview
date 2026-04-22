import os
import datetime

JOURNAL_FILE = ".jules/sentinel.md"
DATE_STR = datetime.date.today().strftime("%Y-%m-%d")
ENTRY = f"""## {DATE_STR} - [Defense-in-Depth] Enforce Authorization in Internal Helpers
**Vulnerability:** Internal helper functions (like `logActivity`) that perform database mutations often accept a `userId` parameter but lack an internal `requireUser(userId)` check, assuming the caller has already validated authorization.
**Learning:** If these internal helpers are ever accidentally exported from a `"use server"` file or directly exposed to an API route, they become vulnerable to Insecure Direct Object Reference (IDOR), allowing an attacker to mutate data for other users by spoofing the `userId`.
**Prevention:** Apply a defense-in-depth approach by enforcing `requireUser(userId)` or equivalent authorization checks directly within internal mutation helpers, even if they are currently only called by other authenticated Server Actions. Always update the corresponding test suites to mock the authenticated session context when adding these internal checks.
"""

os.makedirs(os.path.dirname(JOURNAL_FILE), exist_ok=True)
with open(JOURNAL_FILE, "a") as f:
    f.write("\n" + ENTRY)
