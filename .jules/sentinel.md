
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
## 2024-06-25 - Unprotected List Deletion Action (Rate Limiting)
**Vulnerability:** The `deleteList` Server Action (`deleteListImpl`) lacked rate limiting.
**Learning:** Even destructive operations that are presumed to be low frequency (like deleting a user-created list) require consistent rate limiting to protect against programmatic abuse or DoS vectors, similar to other mutative endpoints.
**Prevention:** Apply the `rateLimit` utility to all destructive Server Actions to maintain a consistent defense-in-depth posture across the application API.

## 2024-05-18 - Missing Rate Limiting on State Mutation Endpoint
**Vulnerability:** The `toggleTaskCompletionImpl` server action, unlike other task mutations (`createTask`, `updateTask`, `deleteTask`), did not have rate limiting applied.
**Learning:** Security controls like rate limiting must be consistently applied across all state-mutating endpoints, even seemingly innocuous ones like toggling a boolean. An attacker could rapidly toggle task completion states to trigger numerous downstream side effects (gamification XP recalculations, unblocking dependencies, sync dispatch events, logging), potentially causing DoS.
**Prevention:** When adding new mutative endpoints or refactoring existing ones, ensure the `rateLimit` utility (or similar controls) is applied uniformly to prevent abuse of downstream side-effects.
## 2025-02-23 - Missing Rate Limits on Custom Icon Mutations
**Vulnerability:** The server actions `createCustomIconImpl` and `deleteCustomIconImpl` lacked rate limiting constraints.
**Learning:** While creation actions (like `createTask`) were rate-limited, other resource mutations (like custom icons) were missed, leaving the system vulnerable to potential DoS attacks via unbounded script execution or brute-force deletion.
**Prevention:** Ensure that the `rateLimit` utility (e.g., `await rateLimit(\`resource:action:${userId}\`, count, window)`) is applied consistently across *all* mutative Server Actions, not just primary entities like tasks or lists.
## 2026-06-22 - Rate Limiting Missing on Template Update and Delete Endpoints
**Vulnerability:** The Server Actions for updating (`updateTemplateImpl`) and deleting (`deleteTemplateImpl`) templates were exposed without rate limiting.
**Learning:** Destructive operations and general mutations must be consistently rate-limited, even if they aren't the primary actions an application supports. Overlooking these creates asymmetric DoS vectors.
**Prevention:** Apply the codebase's standard `rateLimit` utility on EVERY mutative Server Action.
## 2026-07-09 - Rate Limiting Missing on Label Update and Delete Endpoints\n**Vulnerability:** The Server Actions for updating (`updateLabelImpl`) and deleting (`deleteLabelImpl`) labels were exposed without rate limiting.\n**Learning:** Destructive operations and general mutations must be consistently rate-limited, even if they aren't the primary actions an application supports. Overlooking these creates asymmetric DoS vectors.\n**Prevention:** Apply the codebase's standard `rateLimit` utility on EVERY mutative Server Action.
