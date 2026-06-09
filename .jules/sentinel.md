## 2025-06-05 - Rate Limiting Missing on Reorder Endpoints
**Vulnerability:** The Server Actions for reordering tasks (`reorderTasksImpl`), lists (`reorderListsImpl`), and labels (`reorderLabelsImpl`) lacked rate limiting.
**Learning:** While creation and mutation endpoints are often the primary focus for rate limiting, endpoints that perform bulk operations or complex sorting (like reordering) are also vectors for DoS attacks or database exhaustion if left unprotected.
**Prevention:** Apply the `rateLimit` utility consistently across all mutative Server Actions, regardless of whether they create new records or modify existing states like ordering.
