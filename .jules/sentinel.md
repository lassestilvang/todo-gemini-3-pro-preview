## 2026-01-25 - [Critical] IDOR in Server Actions
**Vulnerability:** Server Actions (e.g. `getTasks`) accepted `userId` as an argument and trusted it blindly, allowing any user to access/modify any other user's data by guessing their ID.
**Learning:** Exported "use server" functions are public API endpoints. Arguments must not be trusted for authorization.
**Prevention:** Use a central `requireUser(userId)` helper that validates the session user matches the requested resource owner at the start of every sensitive Server Action.

## 2026-02-05 - [Testing] Verifying Auth Boundaries
**Vulnerability:** Unit tests for Server Actions often fail to verify security checks because of missing DB mocks, leading to "tautological" tests that only verify the mock throws.
**Learning:** Testing security boundaries requires verifying the *call contract* (arguments passed to the check), not just the outcome.
**Prevention:** Use `mock.module` and spies (`mock()`) to assert `expect(requireUserMock).toHaveBeenCalledWith(expectedId)` to prove the action enforces the boundary correctly.

## 2026-10-25 - [Critical] Unprotected User Data Actions
**Vulnerability:** `updateUserPreferences`, `custom-icons` actions, and `gamification` read actions were missing `requireUser` checks, allowing IDOR.
**Learning:** Even "read-only" or "preference" actions are sensitive. The existence of `requireUser` in the codebase does not guarantee its usage.
**Prevention:** Audit all "use server" functions. Enforce a lint rule or code review checklist that requires `requireUser` or explicit public access comment for every exported server action.

## 2026-10-26 - [Critical] IDOR in Gamification Logic
**Vulnerability:** `checkAchievements` in `src/lib/actions/gamification.ts` was a public Server Action missing `requireUser` check, allowing unauthorized users to trigger achievement checks (and potential unlocking) for arbitrary users.
**Learning:** Logic functions exported as Server Actions must explicitly validate `userId` even if they seem like internal helpers. If it has `"use server"` at the file top, *everything* exported is public.
**Prevention:** Audit all exported functions in `"use server"` files. Prefer keeping internal logic in separate files without `"use server"` or explicitly unexported.

## 2026-10-27 - [Critical] Unprotected View and Template Actions
**Vulnerability:** `view-settings.ts` and `templates.ts` server actions accepted `userId` as an argument but failed to validate it against the authenticated session, allowing full IDOR (Read/Write/Delete) on other users' data.
**Learning:** Checking ownership inside the query (e.g. `where userId = ?`) is insufficient if the query parameter itself is trusted input from the client.
**Prevention:** All server actions accepting `userId` MUST call `await requireUser(userId)` as the first statement. Added regression tests in `src/test/integration/security-missing-auth.test.ts`.

## 2026-10-28 - [Critical] IDOR in Time Tracking Actions
**Vulnerability:** All functions in `src/lib/actions/time-tracking.ts` (e.g., `startTimeEntry`, `stopTimeEntry`) accepted `userId` as an argument without validating it against the session. This allowed any user to read, modify, or delete another user's time entries.
**Learning:** `withErrorHandling` wrapper catches `ForbiddenError` and returns a failure result, meaning tests must assert on the result object (`result.success === false`) rather than expecting a thrown error.
**Prevention:** Added `await requireUser(userId)` to the start of every exported function in `time-tracking.ts`. Created `src/lib/actions/time-tracking.security.test.ts` to verify IDOR protection.

## 2026-10-28 - [Critical] Unprotected Label Actions
**Vulnerability:** `src/lib/actions/labels.ts` server actions (`getLabels`, `createLabel`, etc.) accepted `userId` but failed to validate it against the authenticated session, allowing IDOR.
**Learning:** Systematic checks (e.g., `grep` for "userId" without "requireUser") reveal vulnerabilities that manual review might miss.
**Prevention:** Added `await requireUser(userId)` to all exported functions in `labels.ts`. Created `labels.security.test.ts` to prevent regression.

## 2026-10-29 - [Testing] CI Timeouts on Radix Primitives
**Vulnerability:** CI checks failed consistently on `TemplateManager` and `Select` tests due to timeouts (3000ms-15000ms), despite local success. `Select` interactions specifically failed instantly or timed out in CI due to portal rendering delays.
**Learning:** CI environments are significantly slower than local dev machines. `waitFor` with `getByRole` can be flaky if the element isn't immediately available in the accessible tree. `findByRole` is more robust as it combines waiting and querying.
**Prevention:** Increased test execution timeouts to 30000ms-40000ms and switched to `findByRole` with 30000ms timeout for critical UI interactions in CI.

## 2026-02-01 - [High] IDOR in Label Management
**Vulnerability:** `src/lib/actions/labels.ts` server actions accepted `userId` as an argument without validating it against the session, allowing attackers to manage other users' labels.
**Learning:** CRUD operations on auxiliary resources (like labels/tags) are often overlooked for security checks compared to core resources (like tasks), but they are equally vulnerable to IDOR.
**Prevention:** Audit all resources, including "minor" ones. Ensure every exported Server Action that takes a `userId` calls `requireUser(userId)` immediately.

## 2026-10-29 - [Critical] IDOR in Task Dependencies
**Vulnerability:** `getBlockers` and `getBlockedTasks` in `src/lib/actions/dependencies.ts` accepted task IDs and returned related tasks without verifying if the user owned the task or the blocker.
**Learning:** Checking ownership is critical for ALL read operations, not just write operations. Even "helper" data like dependencies can leak information about tasks.
**Prevention:** Updated functions to accept `userId` and verify ownership of the primary entity (task or blocker) before returning data.

## 2026-10-31 - [Critical] IDOR in Dependencies and Reminders
**Vulnerability:** `src/lib/actions/dependencies.ts` and `src/lib/actions/reminders.ts` server actions accepted `userId` as an argument without validating it against the session, allowing attackers to manage other users' task dependencies and reminders.
**Learning:** Even if an action is "simple" (like adding a dependency or reminder), if it takes a `userId` and writes to the DB, it must be protected. The pattern of missing checks is consistent across less "core" modules.
**Prevention:** Applied `requireUser(userId)` to `dependencies.ts` and `reminders.ts`. Added reproduction test `src/test/integration/security-dependencies.test.ts` to catch future regressions.

## 2026-02-06 - [High] IDOR in Log Retrieval
**Vulnerability:** `getTaskLogs`, `getActivityLog`, and `getCompletionHistory` in `src/lib/actions/logs.ts` were missing authorization checks. `getTaskLogs` (taking only `taskId`) allowed viewing logs of any task by ID. `getActivityLog` and `getCompletionHistory` accepted `userId` without validation.
**Learning:** Functions that retrieve history/logs are sensitive and prone to IDOR because they often lack the "natural" user ownership context that creation/update actions have.
**Prevention:** Added `requireUser` checks. For `getTaskLogs(taskId)`, we must fetch the current user and filter the query by `userId` to implicitly verify ownership of the task/log.

## 2026-02-05 - [Critical] IDOR in Saved Views
**Vulnerability:** `views.ts` server actions (`getSavedViews`, etc.) accepted `userId` but failed to validate it against the authenticated session, allowing users to manipulate other users' saved views.
**Learning:** Even lower-priority features like "Saved Views" expose critical data. Consistency in security checks across ALL modules is vital.
**Prevention:** Added `requireUser` checks to `views.ts`. Added `views.security.test.ts`.

## 2026-02-12 - [Critical] IDOR in Task Label Assignment
**Vulnerability:** `createTask` and `updateTask` allowed linking arbitrary label IDs to a task without verifying ownership. This allowed attackers to enumerate and view details (name, color, icon) of other users' labels by linking them to their own tasks.
**Learning:** Checking `requireUser(userId)` protects the main entity (Task) but not related entities (Labels) referenced by ID. Relational data integrity must be enforced explicitly.
**Prevention:** Validate ownership of ALL foreign keys/related IDs passed from the client before inserting into junction tables. Filter or reject invalid IDs.

## 2026-02-13 - [Critical] IDOR in Subtask Creation
**Vulnerability:** `createSubtask` and `createTask` (with `parentId`) allowed creating a task linked to ANY parent task ID, even if owned by another user. This created an unauthorized relationship between users' data.
**Learning:** When implementing Server Actions that create or link entities (e.g., subtasks with `parentId`), explicitly query the database to verify the parent entity belongs to the authenticated user before proceeding, to prevent IDOR.
**Prevention:** Added explicit parent task ownership checks (`select ... where id = ? and userId = ?`) in `createTask` and `createSubtask`.

## 2026-02-14 - [Critical] IDOR in Dependencies and Reminders (Related Entities)
**Vulnerability:** `addDependency`, `removeDependency`, `createReminder`, and `deleteReminder` accepted `taskId` or `blockerId` arguments without verifying if these tasks belonged to the authenticated `userId`. This allowed users to link/block other users' tasks or manage reminders for tasks they don't own.
**Learning:** `requireUser(userId)` only validates the session user. It does NOT automatically validate that foreign keys (like `taskId`) belong to that user. Explicit ownership checks are mandatory for all relational IDs.
**Prevention:** Before inserting/deleting dependent records (dependencies, reminders, subtasks), always query the parent `tasks` table with `where(and(eq(tasks.id, foreignId), eq(tasks.userId, userId)))` to confirm ownership.

## 2026-02-14 - [Critical] IDOR in Google Tasks Mapping
**Vulnerability:** `setGoogleTasksListMappings` in `src/lib/actions/google-tasks.ts` accepted `listId` without verifying ownership, allowing attackers to map their Google Task list to a victim's local list and view/modify tasks via sync.
**Learning:** Checking `process.env.NODE_ENV === "test"` *before* security checks can mask vulnerabilities in tests if the test environment returns early. Security checks must always run before environment bypasses.
**Prevention:** Always place `requireUser` and ownership verification at the very top of the function. Ensure regression tests (like `google-tasks.security.test.ts`) fail if these checks are missing or bypassed.

## 2026-02-15 - [High] Missing Rate Limiting on Resource Creation
**Vulnerability:** `createList` and `createLabel` server actions lacked rate limiting, allowing a malicious or buggy client to create unlimited resources (lists/labels) and exhaust database storage or degrade performance (DoS).
**Learning:** While `withErrorHandling` sanitizes errors, it masks the specific cause of failure (e.g. rate limit vs DB error). Throwing `ValidationError` allows the client to receive the specific error message, which is necessary for rate limit feedback.
**Prevention:** Enforce `rateLimit(userId, limit, window)` on all resource creation actions. Use `ValidationError` to communicate policy violations like rate limits to the client.

## 2026-10-31 - [High] Environment Bypasses Masking Authentication Vulnerabilities
**Vulnerability:** `src/lib/actions/google-tasks.ts` and `src/lib/actions/todoist.ts` had early return bypasses (`if (process.env.NODE_ENV === "test") { return; }`) *before* validating the user session via `getCurrentUser()`. This allowed unauthenticated requests to succeed in test environments, masking potential missing authentication vulnerabilities and breaking the principle that tests should validate security boundaries.
**Learning:** Security checks must ALWAYS be the first operation in a Server Action. Test environment bypasses (or any other bypasses) must only occur after the user has been fully authenticated and authorized.
**Prevention:** Audit all Server Actions to ensure `requireUser()` or `getCurrentUser()` is called before any `process.env.NODE_ENV` checks or early returns. Tests should explicitly mock the authenticated user rather than relying on global environment bypasses for authentication.
## 2024-05-24 - DoS Vector in Bulk Actions via Missing Array Limit
**Vulnerability:** The server actions for reordering lists (`reorderListsImpl`) and labels (`reorderLabelsImpl`) did not enforce a maximum length on the array of items to reorder.
**Learning:** Because these actions dynamically construct a massive `CASE/WHEN` SQL statement using `sql.join()`, passing a massive array (e.g., 100,000+ items) allows an attacker to exhaust server memory and overwhelm the database parsing engine, leading to Denial of Service (DoS) – even if they only operate on their own user space.
**Prevention:** Always explicitly validate array lengths (e.g., `if (items.length > 1000) throw new ValidationError(...)`) before utilizing them to build dynamic multi-row SQL queries.

## 2026-11-05 - [High] DoS via Unbounded Array Allocation before Authentication
**Vulnerability:** In `src/lib/actions/labels.ts` (`reorderLabelsImpl`), `items.map((i) => i.id)` was executed *before* `requireUser(userId)` and before the `items.length > 1000` limit check. This allowed unauthenticated attackers to send massive arrays (e.g., millions of items) and force the server to allocate memory and block the event loop, causing Denial of Service. Additionally, `src/lib/actions/data-migration.ts` lacked array length bounds on `BackupSchema`.
**Learning:** O(N) operations like `.map` or `.filter` on user-provided arrays must never occur before authentication and array length validation. Zod schemas parsing potentially massive JSON payloads (like backups) must enforce strict `.max()` limits on arrays to prevent memory exhaustion during parsing and mapping.
**Prevention:** Moved `items.map` after `requireUser` and `items.length > 1000` in `labels.ts`. Added `.max(100000)` limits to arrays in `BackupSchema`. Always validate array bounds before processing them.

## 2026-11-05 - [High] DoS via Unvalidated JSON Schema Arrays
**Vulnerability:** In `src/lib/actions/data-migration.ts`, `BackupSchema` used `z.array(z.any())` to validate user-uploaded JSON files for importing workspaces. An attacker could provide arrays containing invalid elements (e.g., `lists: ["string", 123]`) instead of the expected objects. The application would then blindly iterate and access properties (e.g., `list.slug`), crashing with unhandled TypeErrors and causing a Denial of Service.
**Learning:** When validating complex JSON payloads using tools like Zod, never use `z.any()` for arrays whose elements are iterated over and property-accessed in the code. If an attacker can inject primitives or structurally incorrect objects, it guarantees runtime crashes.
**Prevention:** Replaced `z.array(z.any())` with strict structural definitions like `z.array(z.object({ id: z.number(), name: z.string(), ... }).passthrough())`. The `.passthrough()` allows unknown keys for backward compatibility but enforces the presence and type of required fields, guaranteeing structural integrity before processing.

## 2026-11-05 - [High] DoS via Unbounded Recursive Template Instantiation
**Vulnerability:** In `src/lib/actions/templates.ts`, the `instantiateTemplateImpl` function lacked a maximum limit on the total number of tasks that could be created from a single template payload. An attacker could craft a malicious JSON payload with excessive nested subtasks, triggering thousands of parallel `createTask` database calls in `createRecursive`. This caused a Denial of Service (DoS) by exhausting server memory, creating excessive DB connections, and blocking the Node.js event loop.
**Learning:** Even if an endpoint is rate-limited (e.g., 50 template instantiations per hour), the payload *content* complexity must also be strictly bounded. Recursive or deeply nested user data is a prime vector for asymmetric resource exhaustion attacks.
**Prevention:** Introduced a `taskCount` state variable within the instantiation function and enforced a hard limit (`MAX_TASKS_PER_TEMPLATE = 100`). Throws a `ValidationError` early in the recursion loop to halt execution if the payload attempts to exceed the maximum allowed complexity.
## 2026-11-06 - [Medium] Logic Flaw / Data Corruption in Google Tasks Mapping
**Vulnerability:** `setGoogleTasksListMappings` in `src/lib/actions/google-tasks.ts` lacked validation to prevent duplicate mappings (mapping multiple Google Tasks lists to the same local list or vice versa), unlike the Todoist implementation. This allowed users to map a local list to multiple external task lists, or map multiple local lists to the same external list.
**Learning:** During sync, this many-to-one or one-to-many relationship causes unpredictable data conflicts, potential data overwrites (corruption), and infinite loop/DoS behaviors where tasks bounce back and forth during conflict resolution.
**Prevention:** Added `hasDuplicateStrings` and `hasDuplicateNonNullNumbers` utility checks to validate uniqueness of external and local IDs in the mapping payload before proceeding with database updates.

## 2026-03-01 - [DoS/Burst Rate Limiting in Cron Endpoints]
**Vulnerability:** External integration sync endpoints (like `google-tasks-sync`) were processing all users concurrently using `Promise.all()`.
**Learning:** This approach causes a massive, instantaneous burst of concurrent HTTP requests against third-party APIs (like Google Tasks) when the user base grows, leading to severe API rate-limiting penalties and potential server memory exhaustion (DoS).
**Prevention:** Always process bulk external API synchronizations sequentially (e.g., using a `for...of` loop with `await`) to throttle outgoing requests and avoid triggering rate limits.

## 2026-11-06 - [Medium] Logic Flaw / Data Corruption in Google Tasks Mapping
**Vulnerability:** \`setGoogleTasksListMappings\` in \`src/lib/actions/google-tasks.ts\` lacked validation to prevent duplicate mappings (mapping multiple Google Tasks lists to the same local list or vice versa), unlike the Todoist implementation. This allowed users to map a local list to multiple external task lists, or map multiple local lists to the same external list.
**Learning:** During sync, this many-to-one or one-to-many relationship causes unpredictable data conflicts, potential data overwrites (corruption), and infinite loop/DoS behaviors where tasks bounce back and forth during conflict resolution.
**Prevention:** Added \`hasDuplicateStrings\` and \`hasDuplicateNonNullNumbers\` utility checks to validate uniqueness of external and local IDs in the mapping payload before proceeding with database updates.

## 2024-03-22 - [Medium] DoS / Rate Limiting via Concurrent External API Sync
**Vulnerability:** In `src/app/api/google-tasks-sync/route.ts`, the cron job synchronized multiple user integrations concurrently using `Promise.all()`. As the user base grows, this causes sudden bursts of simultaneous requests to the Google Tasks API.
**Learning:** Concurrent execution of external API calls for multiple users leads to rapid exhaustion of third-party rate limits, potentially resulting in IP bans or service degradation (DoS) for all users.
**Prevention:** Replaced `Promise.all()` with a sequential `for...of` loop to stagger API requests and respect third-party rate limits.
