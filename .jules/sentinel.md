
## 2026-06-01 - [Defense-in-Depth] Enforce Authorization in Internal Helpers
**Vulnerability:** Internal helper functions (like `logActivity`) that perform database mutations often accept a `userId` parameter but lack an internal `requireUser(userId)` check, assuming the caller has already validated authorization.
**Learning:** If these internal helpers are ever accidentally exported from a `"use server"` file or directly exposed to an API route, they become vulnerable to Insecure Direct Object Reference (IDOR), allowing an attacker to mutate data for other users by spoofing the `userId`.
**Prevention:** Apply a defense-in-depth approach by enforcing `requireUser(userId)` or equivalent authorization checks directly within internal mutation helpers, even if they are currently only called by other authenticated Server Actions. Always update the corresponding test suites to mock the authenticated session context when adding these internal checks.

## 2025-02-28 - Rate Limiting for External Integrations
**Vulnerability:** Missing rate limiting on external integration mutation endpoints (Google Tasks and Todoist), creating a Denial of Service (DoS) and API exhaustion vulnerability.
**Learning:** Server actions for external integrations were developed without the standard `rateLimit` utility applied to core mutative endpoints, allowing an attacker to repeatedly spam connection, sync, mapping, and conflict resolution requests. This could exhaust external API quotas, degrade database performance, and cause DoS.
**Prevention:** Always apply the `rateLimit` utility to all mutative Server Actions, particularly those interacting with external APIs or performing heavy database transactions, ensuring consistent defense-in-depth across the entire application API surface.

## 2026-06-09 - [Defense-in-Depth] Enforce Authorization in Internal Helpers
**Vulnerability:** Internal helper functions (like `logActivity`) that perform database mutations often accept a `userId` parameter but lack an internal `requireUser(userId)` check, assuming the caller has already validated authorization.
**Learning:** If these internal helpers are ever accidentally exported from a `"use server"` file or directly exposed to an API route, they become vulnerable to Insecure Direct Object Reference (IDOR), allowing an attacker to mutate data for other users by spoofing the `userId`.
**Prevention:** Apply a defense-in-depth approach by enforcing `requireUser(userId)` or equivalent authorization checks directly within internal mutation helpers, even if they are currently only called by other authenticated Server Actions. Always update the corresponding test suites to mock the authenticated session context when adding these internal checks.
## 2025-06-05 - Rate Limiting Missing on Reorder Endpoints
**Vulnerability:** The Server Actions for reordering tasks (`reorderTasksImpl`), lists (`reorderListsImpl`), and labels (`reorderLabelsImpl`) lacked rate limiting.
**Learning:** While creation and mutation endpoints are often the primary focus for rate limiting, endpoints that perform bulk operations or complex sorting (like reordering) are also vectors for DoS attacks or database exhaustion if left unprotected.
**Prevention:** Apply the `rateLimit` utility consistently across all mutative Server Actions, regardless of whether they create new records or modify existing states like ordering.
## 2025-06-05 - Rate Limiting Missing on Reorder Endpoints
**Vulnerability:** The Server Actions for reordering tasks (`reorderTasksImpl`), lists (`reorderListsImpl`), and labels (`reorderLabelsImpl`) lacked rate limiting.
**Learning:** While creation and mutation endpoints are often the primary focus for rate limiting, endpoints that perform bulk operations or complex sorting (like reordering) are also vectors for DoS attacks or database exhaustion if left unprotected.
**Prevention:** Apply the `rateLimit` utility consistently across all mutative Server Actions, regardless of whether they create new records or modify existing states like ordering.
## 2024-06-10 - Unprotected Mutative Server Actions (Rate Limiting)
**Vulnerability:** The `saveViewSettings` and `resetViewSettings` Server Actions were exposed without rate limiting, allowing potential DoS attacks or excessive database load via rapid successive requests.
**Learning:** Even low-impact preference endpoints require consistent rate limiting because the computational cost (auth, DB write) still taxes the infrastructure. Overlooking "minor" endpoints creates asymmetric DoS vectors.
**Prevention:** Always implement the codebase's standard rate limiting (e.g., `rateLimit(\`action:${userId}\`)`) on EVERY mutative Server Action, regardless of the perceived sensitivity of the data being modified.
