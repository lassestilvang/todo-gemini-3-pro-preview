## 2025-02-28 - [Add Rate Limiting to Mutative Actions]
**Vulnerability:** Found that mutative actions like `updateTaskImpl` and `deleteTaskImpl` lacked rate limiting, making them vulnerable to abuse and DoS attacks.
**Learning:** Security by default means enforcing reasonable constraints on all endpoints, not just creation paths.
**Prevention:** Apply the `rateLimit` utility consistently across all mutative Server Actions, providing a robust defense-in-depth security posture.
