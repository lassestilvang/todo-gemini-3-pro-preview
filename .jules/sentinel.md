## 2025-02-28 - [Add Rate Limiting to Mutative Actions]
**Vulnerability:** Found that mutative actions like `updateTaskImpl` and `deleteTaskImpl` lacked rate limiting, making them vulnerable to abuse and DoS attacks.
**Learning:** Security by default means enforcing reasonable constraints on all endpoints, not just creation paths.
**Prevention:** Apply the `rateLimit` utility consistently across all mutative Server Actions, providing a robust defense-in-depth security posture.

## 2026-06-01 - [Defense-in-Depth] Enforce Authorization in Internal Helpers
**Vulnerability:** Internal helper functions (like `logActivity`) that perform database mutations often accept a `userId` parameter but lack an internal `requireUser(userId)` check, assuming the caller has already validated authorization.
**Learning:** If these internal helpers are ever accidentally exported from a `"use server"` file or directly exposed to an API route, they become vulnerable to Insecure Direct Object Reference (IDOR), allowing an attacker to mutate data for other users by spoofing the `userId`.
**Prevention:** Apply a defense-in-depth approach by enforcing `requireUser(userId)` or equivalent authorization checks directly within internal mutation helpers, even if they are currently only called by other authenticated Server Actions. Always update the corresponding test suites to mock the authenticated session context when adding these internal checks.

## 2025-02-28 - Rate Limiting for External Integrations
**Vulnerability:** Missing rate limiting on external integration mutation endpoints (Google Tasks and Todoist), creating a Denial of Service (DoS) and API exhaustion vulnerability.
**Learning:** Server actions for external integrations were developed without the standard `rateLimit` utility applied to core mutative endpoints, allowing an attacker to repeatedly spam connection, sync, mapping, and conflict resolution requests. This could exhaust external API quotas, degrade database performance, and cause DoS.
**Prevention:** Always apply the `rateLimit` utility to all mutative Server Actions, particularly those interacting with external APIs or performing heavy database transactions, ensuring consistent defense-in-depth across the entire application API surface.
