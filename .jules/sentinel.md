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
