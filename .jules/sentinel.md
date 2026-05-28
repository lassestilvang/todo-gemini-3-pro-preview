SENTINEL'S JOURNAL - CRITICAL LEARNINGS ONLY:

## 2024-05-04 - [Data Integrity] Enforce Atomic Transactions on Integration Disconnect
**Vulnerability:** Sequential `db.delete` operations in `disconnectGoogleTasks` and `disconnectTodoist` were executed without a database transaction. If one operation failed, it could leave orphaned data, causing data inconsistencies and potential state leakage.
**Learning:** Performing multiple related database mutations sequentially without a transaction exposes the system to partial state updates. In scenarios involving the cleanup of scoped data (like integrations or settings), atomicity must be guaranteed.
**Prevention:** Always enforce atomicity by wrapping sequential dependent database mutations (inserts, updates, or deletes) in a database transaction (\`await db.transaction(async (tx) => { ... })\`).

## 2024-05-04 - [Data Integrity] Missing Database Transactions in Mapping Updates
**Vulnerability:** In `google-tasks.ts` and `todoist.ts`, the external integration mapping functions (`setGoogleTasksListMappings`, `setTodoistProjectMappings`, and `setTodoistLabelMappings`) were executing sequential `db.delete(externalEntityMap)` and `db.insert(externalEntityMap)` operations outside of a database transaction.
**Learning:** This is a Time-of-Check to Time-of-Use (TOCTOU) / data integrity risk. If the application process crashes or the `insert` query fails after the `delete` operation succeeds, the user's previously existing external entity mappings are permanently lost, leading to broken synchronizations.
**Prevention:** Always wrap sequences of related and dependent database mutations (like wiping and replacing configuration or mappings) inside a `db.transaction(async (tx) => { ... })` block to ensure atomic execution.

## 2025-05-06 - Enforce Atomicity for Sequential Database Mutations
**Vulnerability:** Partial data state updates during sequential database operations (e.g., creating a task, assigning labels, logging activity). If an operation after the primary entity creation fails, the database is left in an inconsistent state with orphaned records or missing expected metadata.
**Learning:** Sequential inserts or updates that depend on a common operation (like a primary insertion) must be treated as a single unit of work. Application-level execution does not guarantee atomicity in the event of failures or errors.
**Prevention:** Always wrap multiple dependent database mutations within a database transaction (\`await db.transaction(async (tx) => { ... })\`). This ensures that either all operations succeed completely or all fail gracefully, maintaining data integrity.

## 2024-05-12 - [Data Integrity] Missing Transactions in Reminders Actions
**Vulnerability:** In `src/lib/actions/reminders.ts`, the `createReminderImpl` and `deleteReminderImpl` functions performed sequential database mutations (inserting/deleting a reminder, then inserting a task log) outside of a database transaction.
**Learning:** Performing multiple related mutations sequentially without a transaction creates a risk of partial state updates if one operation fails, compromising data integrity (e.g., creating a reminder without logging it, or logging its deletion without actually removing it).
**Prevention:** Always enforce atomicity by wrapping sequential dependent database mutations, such as CRUD operations on primary entities combined with secondary logging or tracking entries, in a `db.transaction(async (tx) => { ... })` block.

## 2024-05-12 - Template Instantiation List IDOR
**Vulnerability:** `instantiateTemplateImpl` in `src/lib/actions/templates.ts` accepted an optional `listId` but lacked an explicit ownership verification for that list before proceeding. While the underlying `createTask` prevented a full exploit, lack of validation at the boundary could lead to partial execution or unnecessary resource usage.
**Learning:** Always validate ownership of all relational IDs (like `listId`) at the boundary of a server action, even if underlying utilities might eventually catch it, to ensure defense-in-depth and fail-fast semantics.
**Prevention:** Imported and used `getListInternal(listId, userId)` at the beginning of `instantiateTemplateImpl` to verify list ownership before processing the template.

## 2025-05-08 - [Defense-in-Depth] Missing Input Length Validations
**Vulnerability:** Several internal helpers and integration endpoints (e.g., `createTodoistMappingList`, `createSubtaskImpl`, `logActivity`) accepted string inputs without checking their maximum length. This allowed for excessively large payload insertions into the database, potentially leading to errors or DoS conditions.
**Learning:** Even if data comes from authenticated users or is processed internally, all string inputs must be length-bounded before database insertion to prevent excessive storage consumption or database layer errors.
**Prevention:** Apply explicit length validation checks (e.g., `if (input.length > MAX_LENGTH) throw new ValidationError(...)`) or silently truncate long strings (like activity log details) if the excess data is non-critical.

## 2024-05-17 - Missing Transactions in Mapping Actions
**Vulnerability:** The `setTodoistProjectMappings` and `setTodoistLabelMappings` actions performed sequential database operations (`delete` and `insert...onConflictDoUpdate`) without wrapping them in a transaction.
**Learning:** Any sequence of data modifications (especially `delete` followed by `insert` that replaces state) MUST be atomic to prevent a partial failure from leaving the database in an inconsistent state or orphaned records.
**Prevention:** Enforce the use of `db.transaction()` for multi-step mutations where intermediate failure is intolerable.

## 2024-05-22 - Search Query Denial of Service (ILIKE / Trigram DoS)
**Vulnerability:** Found missing input length validation on search queries in `getActivityLog`, `searchAll`, and `searchTasksImpl`. These unfiltered queries were passed directly to `ILIKE`, `LIKE` or pg_trgm similarity functions.
**Learning:** Supplying excessively long strings to database text-matching functions (especially those doing sequential scans like `%term%` or trigram evaluation) can exhaust database CPU resources, leading to Denial of Service. While standard inputs are typically small, an attacker can intentionally craft massive search strings.
**Prevention:** Always enforce a maximum length limit (e.g., `.substring(0, 100)`) on user-provided strings before using them in database text-search operations.

## 2024-05-22 - [Security] Prevent IDOR vulnerabilities by enforcing strict user.id queries
**Vulnerability:** Several Server Actions (e.g. `createTaskImpl`, `updateTaskImpl`, `createLabelImpl`, `deleteListImpl`, etc.) were missing strict `eq(table.userId, user.id)` validation in their `WHERE` queries or were falling back to user-provided payloads (e.g. `taskData.userId`) in multi-tenant contexts. This allowed attackers to manipulate foreign IDs (`labelIds`, `listId`, `parentId`) to bypass authorization boundaries and potentially access, attach, or execute actions on resources owned by other users (IDOR).
**Learning:** Checking `await requireUser(userId)` at the beginning of an action verifies that the authenticated token matches the passed-in `userId` argument. However, if subsequent queries blindly use data from a payload (`taskData.userId` instead of the strongly authenticated `user.id`), or fail to include `eq(table.userId, user.id)` constraints when looking up nested relationships (like `validLabels` or `toList`), malicious users can cross-pollinate data.
**Prevention:** Always save the strongly-typed authenticated user instance (`const user = await requireUser(userId);`) and explicitly use `user.id` for all downstream ownership filters in database queries, particularly when traversing related entity IDs (e.g., labels, lists, templates).

## 2024-05-24 - [Correction] neon-http does not support db.transaction()
**Vulnerability:** A previous journal entry incorrectly stated that the `drizzle-orm/neon-http` driver fully supports `db.transaction()`. This caused a regression where transaction blocks added to `src/lib/actions/tasks/mutations.ts` crashed the Next.js production/E2E server with `Error: No transactions support in neon-http driver`.
**Learning:** The HTTP-based driver (`drizzle-orm/neon-http`) fundamentally does not support stateful transactions because each query is a separate stateless HTTP request. `db.transaction()` is explicitly hardcoded to throw an error in this driver.
**Prevention:** Never use `db.transaction()` when the database connection is configured with `drizzle-orm/neon-http`. Instead, use `db.batch()` for independent queries, or standard sequential execution. If true transactions are absolutely necessary, the application must be reconfigured to use a stateful connection via `@neondatabase/serverless` WebSocket pool (`neon-serverless`).
## $(date +%Y-%m-%d) - [Data Integrity] Missing Database Transactions in Task Mutations
**Vulnerability:** Core functions `createTaskImpl` and `reorderTasksImpl` in `src/lib/actions/tasks/mutations.ts` performed sequential database mutations (inserting tasks and their labels/logs) without wrapping them in an atomic database transaction. An outdated comment incorrectly claimed `neon-http` did not support `db.transaction()`.
**Learning:** The `drizzle-orm/neon-http` driver fully supports `db.transaction()`. Performing dependent operations sequentially without it creates a significant risk of partial state updates (e.g., creating a task but failing to insert its labels or activity log) if the server crashes or network fails mid-operation.
**Prevention:** Always verify if an ORM driver supports transactions by testing it or checking the official documentation, rather than relying on legacy comments. Wrap all sequential, dependent database mutations in `await db.transaction(async (tx) => { ... })` and pass the `tx` object to all nested queries.

## 2024-05-22 - [Security] Prevent IDOR vulnerabilities by enforcing strict user.id queries

**Vulnerability:** Several Server Actions (e.g. `createTaskImpl`, `updateTaskImpl`, `createLabelImpl`, `deleteListImpl`, etc.) were missing strict `eq(table.userId, user.id)` validation in their `WHERE` queries or were falling back to user-provided payloads (e.g. `taskData.userId`) in multi-tenant contexts. This allowed attackers to manipulate foreign IDs (`labelIds`, `listId`, `parentId`) to bypass authorization boundaries and potentially access, attach, or execute actions on resources owned by other users (IDOR).
**Learning:** Checking `await requireUser(userId)` at the beginning of an action verifies that the authenticated token matches the passed-in `userId` argument. However, if subsequent queries blindly use data from a payload (`taskData.userId` instead of the strongly authenticated `user.id`), or fail to include `eq(table.userId, user.id)` constraints when looking up nested relationships (like `validLabels` or `toList`), malicious users can cross-pollinate data.
**Prevention:** Always save the strongly-typed authenticated user instance (`const user = await requireUser(userId);`) and explicitly use `user.id` for all downstream ownership filters in database queries, particularly when traversing related entity IDs (e.g., labels, lists, templates).
## 2024-05-22 - Search Query Denial of Service (ILIKE / Trigram DoS)
**Vulnerability:** Found missing input length validation on search queries in `getActivityLog`, `searchAll`, and `searchTasksImpl`. These unfiltered queries were passed directly to `ILIKE`, `LIKE` or pg_trgm similarity functions.
**Learning:** Supplying excessively long strings to database text-matching functions (especially those doing sequential scans like `%term%` or trigram evaluation) can exhaust database CPU resources, leading to Denial of Service. While standard inputs are typically small, an attacker can intentionally craft massive search strings.
**Prevention:** Always enforce a maximum length limit (e.g., `.substring(0, 100)`) on user-provided strings before using them in database text-search operations.

## $(date +%Y-%m-%d) - [High] [Security] IDOR Vulnerability in User Preferences
**Vulnerability:** Insecure Direct Object Reference (IDOR) in `updateUserPreferencesImpl` (`src/lib/actions/user.ts`). The function used the `userId` parameter directly in the database `where` clause (`eq(users.id, userId)`) instead of using the strictly authenticated `user.id` obtained from the session.
**Learning:** Even if `await requireUser(userId)` is called at the beginning of an action to verify authentication, using the raw payload ID in subsequent database mutations re-introduces the risk of cross-tenant modifications if the authorization check doesn't properly constrain the downstream operation or if the parameter is somehow modified.
**Prevention:** Always save the strongly-typed authenticated user instance (e.g., `const user = await requireUser(userId);`) and explicitly use `user.id` for all downstream ownership filters in database queries, particularly for direct updates to the user record or related entities.
## $(date +%Y-%m-%d) - [Denial of Service] Missing Input Length Validation on JSON Settings
**Vulnerability:** In `src/lib/actions/views.ts`, the `createSavedViewImpl` function accepted a `settings` property (a JSON string) without any length validation. A malicious actor could submit a massive string payload, leading to excessive database storage consumption or application slowdown (DoS).
**Learning:** Any endpoint accepting dynamic or variable-length data (like JSON strings, descriptions, or serialized states) must enforce a maximum length limit before inserting it into the database, even if the primary fields (like `name`) are validated.
**Prevention:** Always enforce a strict `length` validation check (e.g., `if (data.settings.length > 10000) throw new ValidationError(...)`) on all unbounded string properties within server actions.
## 2024-06-03 - Enforce Input Length Limits on Imported Payload Data
**Vulnerability:** A Denial of Service (DoS) vulnerability via memory exhaustion existed because Zod string validation (`BackupSchema`) in the data migration import flow lacked maximum string length bounds for text fields (like `name`, `description`, `content`, `slug`).
**Learning:** Even if `z.array().max()` limits the number of imported entities, unbounded `z.string()` validation inside those arrays can still be abused by submitting single strings of gigabytes in length. Data parsing boundaries must bound all properties.
**Prevention:** Always enforce explicit input length boundaries (e.g., `.max(255)`, `.max(100000)`) on string payloads when parsing external data using validation libraries like Zod, mirroring limits enforced downstream or in the database.

## 2026-05-28 - [Defense-in-Depth] Enforce Authorization in Internal Helpers
**Vulnerability:** Internal helper functions (like `logActivity`) that perform database mutations often accept a `userId` parameter but lack an internal `requireUser(userId)` check, assuming the caller has already validated authorization.
**Learning:** If these internal helpers are ever accidentally exported from a `"use server"` file or directly exposed to an API route, they become vulnerable to Insecure Direct Object Reference (IDOR), allowing an attacker to mutate data for other users by spoofing the `userId`.
**Prevention:** Apply a defense-in-depth approach by enforcing `requireUser(userId)` or equivalent authorization checks directly within internal mutation helpers, even if they are currently only called by other authenticated Server Actions. Always update the corresponding test suites to mock the authenticated session context when adding these internal checks.
