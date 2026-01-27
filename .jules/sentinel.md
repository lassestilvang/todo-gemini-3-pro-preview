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
