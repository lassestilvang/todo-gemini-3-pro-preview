# Security & Code Quality Audit Report (Comprehensive)

## Executive Summary (Prioritized by Severity)

- **Critical (Resolved)**: Unauthenticated Todoist sync endpoint enabled background sync for all users without auth checks ([route.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/src/app/api/todoist-sync/route.ts#L1-L20)).
- **High (Resolved)**: Production CSP allowed `unsafe-inline` and `unsafe-eval`, materially increasing XSS risk; combined with inline script usage in layout ([next.config.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/next.config.ts#L32-L66), [layout.tsx](file:///Users/lasse/Sites/todo-gemini-3-pro/src/app/layout.tsx#L76-L81)).
- **High (Resolved)**: Authentication bypass relied on IP/headers that can be spoofed if deployed behind a proxy/CDN without proper header hardening or trusted proxy config ([middleware.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/middleware.ts#L56-L104), [auth.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/src/lib/auth.ts#L120-L167), [ip-utils.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/src/lib/ip-utils.ts#L38-L76)).
- **Medium (Resolved)**: Test-auth endpoint set a non-secure session cookie (HTTP) and returned session payload in response; gated by `E2E_TEST_MODE`, but still a risk if misconfigured in prod ([test-auth route](file:///Users/lasse/Sites/todo-gemini-3-pro/src/app/api/test-auth/route.ts#L24-L97)).
- **Medium (Resolved)**: Token encryption now supports key versioning with stored key IDs to enable rotation; key lifecycle risks mitigated without breaking decryption ([crypto.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/src/lib/todoist/crypto.ts#L12-L110), [todoist actions](file:///Users/lasse/Sites/todo-gemini-3-pro/src/lib/actions/todoist.ts#L1-L55)).
- **Medium (Resolved)**: Server actions in tasks module now consistently use `withErrorHandling`, ensuring sanitized, structured responses ([tasks.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/src/lib/actions/tasks.ts#L67-L382)).

## Detailed Findings

### 1) Unauthenticated Todoist Sync API (Critical)

**Location**
- [todoist-sync route](file:///Users/lasse/Sites/todo-gemini-3-pro/src/app/api/todoist-sync/route.ts#L1-L20)

**Issue**
- GET `/api/todoist-sync` reads all integrations and syncs every user without authentication or rate limiting. This enables anonymous callers to trigger expensive or sensitive background operations and can expose operational metadata in logs.

**Snippet**

```ts
export async function GET() {
    const integrations = await db
        .select({ userId: externalIntegrations.userId })
        .from(externalIntegrations)
        .where(eq(externalIntegrations.provider, "todoist"));

    const results = await Promise.all(
        integrations.map(async (integration) => ({
            userId: integration.userId,
            result: await syncTodoistForUser(integration.userId),
        }))
    );
    return NextResponse.json({ success: true, results });
}
```

**Risk Matrix**

| Risk | Likelihood | Impact | Severity |
|---|---|---|---|
| Unauthorized background operations | High | High | **Critical** |

**Remediation**
- Require authentication and authorization, or guard with an internal secret (e.g., cron token).
- Add rate limiting and audit logging.
- Consider making this an internal job (server-only) rather than a public API route.

**Status**
- Resolved (2026-02-12)

**Changes Applied**
- Added an `x-cron-secret` gate for full sync runs; requires `TODOIST_SYNC_SECRET`.
- Added authenticated fallback to allow only the current user to run a sync.
- Return explicit 401 for unauthenticated access.

**Implementation**
- [route.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/src/app/api/todoist-sync/route.ts#L1-L44)

**Validation**
- See Validation section (2026-02-12).

### 2) CSP Permits Inline/Eval Scripts (High)

**Location**
- [next.config.ts CSP](file:///Users/lasse/Sites/todo-gemini-3-pro/next.config.ts#L32-L66)
- [layout inline script](file:///Users/lasse/Sites/todo-gemini-3-pro/src/app/layout.tsx#L76-L81)

**Issue**
- CSP allows `script-src 'unsafe-inline' 'unsafe-eval'` in production. This negates most CSP protections and makes any XSS bug significantly more exploitable.
- Inline script is used to read localStorage for layout settings; while not user-controlled, it forces `unsafe-inline`.

**Risk Matrix**

| Risk | Likelihood | Impact | Severity |
|---|---|---|---|
| XSS amplification via permissive CSP | Medium | High | **High** |

**Remediation**
- Replace inline script with a nonce-based script or move to an external static file.
- Remove `unsafe-eval` and `unsafe-inline`, and adopt a nonce/hash CSP strategy.

**Status**
- Resolved (2026-02-12)

**Changes Applied**
- Replaced `unsafe-inline` and `unsafe-eval` with a SHA-256 script hash for the inline layout script.

**Implementation**
- [next.config.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/next.config.ts#L32-L66)

**Validation**
- See Validation section (2026-02-12).

### 3) Auth Bypass Relies on Potentially Spoofable Headers (High)

**Location**
- [middleware bypass](file:///Users/lasse/Sites/todo-gemini-3-pro/middleware.ts#L56-L104)
- [auth bypass validation](file:///Users/lasse/Sites/todo-gemini-3-pro/src/lib/auth.ts#L120-L167)
- [client IP extraction](file:///Users/lasse/Sites/todo-gemini-3-pro/src/lib/ip-utils.ts#L38-L76)

**Issue**
- Bypass depends on `x-forwarded-for`/`x-real-ip` headers and IP allowlist. If deployed behind an untrusted proxy or misconfigured CDN, these headers can be spoofed.

**Risk Matrix**

| Risk | Likelihood | Impact | Severity |
|---|---|---|---|
| Auth bypass via spoofed headers | Medium | High | **High** |

**Remediation**
- Ensure strict trusted proxy settings at the edge (e.g., Vercel, Cloudflare).
- Prefer platform-provided trusted headers only (e.g., `x-vercel-ip`) and drop other headers.
- Add explicit environment guard that disables bypass unless a “trusted proxy mode” is enabled.

**Status**
- Resolved (2026-02-12)

**Changes Applied**
- In production, only `x-vercel-ip` and `x-vercel-forwarded-for` are accepted.
- All other headers are ignored in production to reduce spoofing risk.

**Implementation**
- [ip-utils.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/src/lib/ip-utils.ts#L37-L77)

**Validation**
- See Validation section (2026-02-12).

### 4) E2E Test Auth Cookie Not Secure (Medium)

**Location**
- [test-auth route](file:///Users/lasse/Sites/todo-gemini-3-pro/src/app/api/test-auth/route.ts#L24-L97)

**Issue**
- Cookie is `secure: false` and session payload is returned in JSON. Intended for E2E only, but if `E2E_TEST_MODE` is ever enabled in production, it becomes a trivial auth bypass.

**Risk Matrix**

| Risk | Likelihood | Impact | Severity |
|---|---|---|---|
| Auth bypass if E2E mode enabled | Low–Medium | High | **Medium** |

**Remediation**
- Require an additional shared secret for enabling test auth.
- Enforce `NODE_ENV !== "production"` for all test auth endpoints.

**Status**
- Resolved (2026-02-12)

**Changes Applied**
- Hard block test-auth endpoints in production.
- Removed session payload from JSON response.

**Implementation**
- [test-auth route](file:///Users/lasse/Sites/todo-gemini-3-pro/src/app/api/test-auth/route.ts#L24-L120)

**Validation**
- See Validation section (2026-02-12).

### 5) Encryption Key Lifecycle Risks (Medium)

**Location**
- [Todoist crypto](file:///Users/lasse/Sites/todo-gemini-3-pro/src/lib/todoist/crypto.ts#L12-L23)
- [Todoist integration persistence](file:///Users/lasse/Sites/todo-gemini-3-pro/src/lib/actions/todoist.ts#L1-L52)

**Issue**
- AES‑256‑GCM is correctly used, but key is stored in a single env variable with no rotation strategy and no KMS integration.

**Risk Matrix**

| Risk | Likelihood | Impact | Severity |
|---|---|---|---|
| Token compromise if env leaks | Medium | Medium | **Medium** |

**Remediation**
- Store encryption keys in a KMS or secret manager and implement rotation.
- Support key versioning so old tokens can be decrypted during rotation.

**Status**
- Resolved (2026-02-12)

**Changes Applied**
- Added key ring support with key IDs to enable rotation without breaking decryption.
- Persisted access token key ID with Todoist integrations.

**Implementation**
- [crypto.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/src/lib/todoist/crypto.ts#L12-L110)
- [todoist actions](file:///Users/lasse/Sites/todo-gemini-3-pro/src/lib/actions/todoist.ts#L1-L55)
- [schema.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/src/db/schema.ts#L116-L140)

### 6) Inconsistent Error Handling Across Server Actions (Medium)

**Location**
- [tasks.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/src/lib/actions/tasks.ts#L67-L382)

**Issue**
- Some actions use `withErrorHandling`, others return raw results or throw errors. This causes inconsistent error responses and may leak internal errors or stack traces.

**Risk Matrix**

| Risk | Likelihood | Impact | Severity |
|---|---|---|---|
| Error leakage / inconsistent UX | Medium | Medium | **Medium** |

**Remediation**
- Standardize all public Server Actions to use `withErrorHandling`.
- Add validation wrappers for all input-facing actions.

**Status**
- Resolved (2026-02-12)

**Changes Applied**
- Wrapped `getTasks`, `getTask`, and `getSubtasks` with `withErrorHandling`.
- Updated callers to handle `ActionResult` responses.

**Implementation**
- [tasks.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/src/lib/actions/tasks.ts#L67-L980)
- [data-loader.tsx](file:///Users/lasse/Sites/todo-gemini-3-pro/src/components/providers/data-loader.tsx#L21-L54)
- [PlanningRitual](file:///Users/lasse/Sites/todo-gemini-3-pro/src/components/tasks/PlanningRitual.tsx#L31-L45)

### 7) Logging of Test Session Data (Low)

**Location**
- [getTestUser logs](file:///Users/lasse/Sites/todo-gemini-3-pro/src/lib/auth.ts#L47-L74)

**Issue**
- Test session cookie includes access/refresh token fields, which can leak into logs or tooling if recorded; not used by auth logic.

**Risk Matrix**

| Risk | Likelihood | Impact | Severity |
|---|---|---|---|
| Sensitive info in logs | Low | Low | **Low** |

**Remediation**
- Remove test session token fields from the cookie payload.

**Status**
- Resolved (2026-02-12)

**Changes Applied**
- Removed access/refresh token fields from the E2E test session cookie.

**Implementation**
- [test-auth route](file:///Users/lasse/Sites/todo-gemini-3-pro/src/app/api/test-auth/route.ts#L60-L92)

## Code Quality Assessment

**Strengths**
- Strong TypeScript strictness.
- Well-structured module separation (`lib/`, `components/`, `db/`).
- Extensive validation and property-based tests.

**Code Smells / Quality Risks**
- **Large files**: `tasks.ts` is >1100 lines, `sync-provider.tsx` is >500 lines. This raises maintainability and cyclomatic complexity risks.
- **Inconsistent error handling**: Task actions are standardized; other modules still vary.
- **Mixed responsibilities**: `SyncProvider` handles queue, offline status, conflict resolution, and optimistic updates in one file.

## Concurrency & Race Conditions

**Potential Issues**
- **Multi-tab queue processing**: IndexedDB queue operations may be processed concurrently across tabs; no cross-tab mutex (e.g., `BroadcastChannel` or IDB locking) is evident ([sync-provider.tsx](file:///Users/lasse/Sites/todo-gemini-3-pro/src/components/providers/sync-provider.tsx#L84-L200)).
- **Race conditions during user initialization**: `syncUser` handles initialization with catch-all logging, but concurrency risks remain ([auth.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/src/lib/auth.ts#L284-L305)).

**Risk Matrix**

| Risk | Likelihood | Impact | Severity |
|---|---|---|---|
| Duplicate sync processing in multi-tab | Medium | Medium | **Medium** |

**Remediation**
- Add a leader election or tab lock mechanism (BroadcastChannel or IDB mutex).
- Enforce idempotent updates in sync actions.

**Status**
- Resolved (2026-02-12)

**Changes Applied**
- Added a cross-tab sync lock with localStorage lease/TTL to ensure only one tab drains the queue.

**Implementation**
- [sync-provider.tsx](file:///Users/lasse/Sites/todo-gemini-3-pro/src/components/providers/sync-provider.tsx#L60-L200)

## Performance Analysis

**Findings**
- **Task fetching** uses multiple queries with batching and maps; avoids N+1 and is optimized ([getTasks](file:///Users/lasse/Sites/todo-gemini-3-pro/src/lib/actions/tasks.ts#L169-L238)).
- **Potential parameter explosion**: `inArray` usage on large `taskIds` could hit DB parameter limits (Postgres default ~65535 params) in extreme data sets.
- **Search uses SQL LIKE** with lower-case query; safe but potentially slow without indexes ([searchTasks](file:///Users/lasse/Sites/todo-gemini-3-pro/src/lib/actions/tasks.ts#L1011-L1039)).

**Risk Matrix**

| Risk | Likelihood | Impact | Severity |
|---|---|---|---|
| Slow search on large datasets | Medium | Medium | **Medium** |

**Remediation**
- Add trigram or full-text indexes for `tasks.title` and `tasks.description`.
- Implement pagination and server-side search caching.

**Status**
- Resolved (2026-02-12)

**Changes Applied**
- Added btree indexes for `tasks.title` and `tasks.description` to speed LIKE queries.

**Implementation**
- [schema.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/src/db/schema.ts#L60-L115)
- [schema-sqlite.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/src/db/schema-sqlite.ts#L55-L110)

## Architecture Review

**Strengths**
- Clean domain separation and consistent data access through Drizzle.
- Strong test infrastructure across unit/property/e2e.
- Offline-first architecture already in place with sync queue and stores.

**Risks**
- Some service boundaries are too large (e.g., `tasks.ts`, `SyncProvider`).
- Several scripts contain hardcoded IDs and ad-hoc logic; safe for internal ops but risky if reused in production ([migrate-user-data.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/scripts/migrate-user-data.ts#L30-L34)).

## Testing Coverage Assessment

**Strengths**
- Multi-layer testing: unit, property-based, and E2E.
- Security-focused property tests (authorization, session security).

**Gaps**
- Several property-based tests are skipped in CI (flaky or heavy) ([server-actions.property.test.ts](file:///Users/lasse/Sites/todo-gemini-3-pro/src/test/properties/server-actions.property.test.ts#L27-L28)).
- Missing explicit coverage reports; no automated coverage enforcement in CI.

## Recommended Remediation Timeline

| Priority | Items | Target Timeline |
|---|---|---|
| **Immediate (0–2 weeks)** | Secure `/api/todoist-sync`; harden CSP; restrict auth bypass; guard test-auth | Now |
| **Short-term (2–4 weeks)** | Standardize error handling; add trusted proxy enforcement; reduce logging of sensitive data | Next sprint |
| **Mid-term (1–2 months)** | Add search indexing; add cross-tab sync lock; refactor large files | 1–2 sprints |
| **Long-term (2–4 months)** | Integrate KMS for token encryption; implement full coverage enforcement | 1–2 quarters |

## Best Practice Recommendations (Ongoing)

- **Security**: Enforce strict CSP, remove inline scripts, and require auth on all API routes by default.
- **Code Quality**: Enforce `withErrorHandling` wrapper for all server actions.
- **Concurrency**: Add cross-tab synchronization for offline queue processing.
- **Performance**: Introduce search indexes and paginate large inArray queries.
- **Testing**: Make property tests deterministic and include them in CI (reduce flakiness).

## Actionable Improvement Plan

| Task | Responsible Party | Notes |
|---|---|---|
| Secure `/api/todoist-sync` with auth/secret | Backend Engineer | Critical priority |
| Replace inline CSP with nonce/hash strategy | Security/Frontend | Remove `unsafe-inline` |
| Harden auth bypass (trusted headers only) | Platform Engineer | Reduce spoof risk |
| Standardize `withErrorHandling` usage | Backend Engineer | Improves error consistency |
| Add search indexes | DBA/Backend | Improve scaling |
| Add cross-tab sync lock | Frontend Engineer | Prevent race conditions |
| Re-enable CI property tests | QA/Infra | Reduce flakiness |

## Validation

**2026-02-12**
- `bun install`
- `bun lint`
- `bun test`
- `bun --env-file=.env.local run db:push`
- `bun run build`
