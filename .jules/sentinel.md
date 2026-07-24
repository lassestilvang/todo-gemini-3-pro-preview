## 2024-07-05 - DoS/Abuse Vulnerability via Missing Rate Limits on Mutations

**Vulnerability:** Found missing rate limiting on multiple mutative Server Actions, specifically `updateList`, `updateLabel`, and `deleteLabel`. While creation endpoints (`createList`, `createLabel`) correctly implemented rate limits, the endpoints for updating or deleting these resources were unprotected.
**Learning:** Security controls like rate limiting are often inconsistently applied across all mutative operations. Developers sometimes focus solely on creation/spam vectors but overlook that excessive updates or deletes can also be abused for Denial-of-Service (DoS) or resource exhaustion.
**Prevention:** Apply the `rateLimit` utility consistently across all mutative endpoints (create, update, delete) to enforce defense in depth and mitigate abuse scenarios, rather than exclusively protecting creation routes.
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
## 2024-07-08 - Rate Limiting Missing on Label and List Update/Delete Endpoints
**Vulnerability:** The Server Actions `updateLabelImpl`, `deleteLabelImpl`, and `updateListImpl` were exposed without rate limiting.
**Learning:** While creation actions (like `createLabelImpl` and `createListImpl`) were correctly protected, the corresponding update and delete operations were missed. This leaves the system vulnerable to potential DoS attacks and resource exhaustion via rapid successive requests to these mutative endpoints.
**Prevention:** Ensure the `rateLimit` utility (e.g., `await rateLimit(\`resource:action:${userId}\`, count, window)`) is consistently applied across *all* mutative Server Actions, not just for creation, to maintain a robust defense-in-depth posture.

## 2026-07-04 - [Defense-in-Depth] Enforce Authorization in Internal Helpers
**Vulnerability:** Internal helper functions (like `logActivity`) that perform database mutations often accept a `userId` parameter but lack an internal `requireUser(userId)` check, assuming the caller has already validated authorization.
**Learning:** If these internal helpers are ever accidentally exported from a `"use server"` file or directly exposed to an API route, they become vulnerable to Insecure Direct Object Reference (IDOR), allowing an attacker to mutate data for other users by spoofing the `userId`.
**Prevention:** Apply a defense-in-depth approach by enforcing `requireUser(userId)` or equivalent authorization checks directly within internal mutation helpers, even if they are currently only called by other authenticated Server Actions. Always update the corresponding test suites to mock the authenticated session context when adding these internal checks.
## 2026-07-06 - [Rate Limiting Missing on Label Update and Delete Endpoints]
**Vulnerability:** The Server Actions for updating (`updateLabelImpl`) and deleting (`deleteLabelImpl`) labels, and updating (`updateListImpl`) lists were exposed without rate limiting.
**Learning:** Destructive operations and general mutations must be consistently rate-limited, even if they aren't the primary actions an application supports. Overlooking these creates asymmetric DoS vectors.
**Prevention:** Apply the codebase's standard rateLimit utility on EVERY mutative Server Action.

## 2026-07-06 - Rate Limiting Missing on Dependencies and Reminders Endpoints
**Vulnerability:** The Server Actions for dependencies (`addDependencyImpl`, `removeDependencyImpl`) and reminders (`createReminderImpl`, `deleteReminderImpl`) and activity logger (`logActivity`) lacked rate limiting.
**Learning:** Like update and delete operations, relational mutative actions between entities (like linking a reminder or a dependency to a task) need protection just like the parent entities. Missing them allows potential DoS attacks on the database.
**Prevention:** Ensure the `rateLimit` utility is consistently applied across *all* mutative Server Actions to maintain robust defense-in-depth.

## 2026-07-24 - Rate Limiting Bypass and Missing Checks on Time Tracking Endpoints
**Vulnerability:** The `startTimeEntry` and `createManualTimeEntry` server actions invoked the `rateLimit` utility but ignored the return value, effectively bypassing rate limits. Additionally, mutative actions (`stopTimeEntry`, `updateTimeEntry`, `deleteTimeEntry`, `updateTaskEstimate`) completely lacked rate limit checks.
**Learning:** Simply calling a rate limiting function is insufficient if the result isn't validated. Also, secondary/auxiliary mutative actions (like stopping a timer or updating estimates) are often overlooked for rate limiting, creating potential DoS and abuse vectors.
**Prevention:** Always verify the return value of rate limit utilities (e.g., `if (!limit.success)`) and ensure rate limiting is systematically applied across all endpoints that mutate state, including updates and deletions.
