## 2024-07-05 - DoS/Abuse Vulnerability via Missing Rate Limits on Mutations

**Vulnerability:** Found missing rate limiting on multiple mutative Server Actions, specifically `updateList`, `updateLabel`, and `deleteLabel`. While creation endpoints (`createList`, `createLabel`) correctly implemented rate limits, the endpoints for updating or deleting these resources were unprotected.
**Learning:** Security controls like rate limiting are often inconsistently applied across all mutative operations. Developers sometimes focus solely on creation/spam vectors but overlook that excessive updates or deletes can also be abused for Denial-of-Service (DoS) or resource exhaustion.
**Prevention:** Apply the `rateLimit` utility consistently across all mutative endpoints (create, update, delete) to enforce defense in depth and mitigate abuse scenarios, rather than exclusively protecting creation routes.
