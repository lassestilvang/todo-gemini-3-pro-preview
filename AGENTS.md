# AGENTS.md - Essentials

Keep this file short and operational. If in doubt, follow existing code patterns in the touched area.

## Stack

- Runtime: Bun 1.0+
- Framework: Next.js 16 (App Router), React 19
- Language: TypeScript strict mode
- DB: Neon PostgreSQL + Drizzle ORM
- Styling/UI: Tailwind CSS v4 + shadcn/ui (new-york)
- Alias: `@/*` -> `./src/*`

## Core Commands

Run these in order for full validation:

```bash
bun install
bun lint
bun test
bun --env-file=.env.local run db:push
bun run build
```

Useful extras:

```bash
bun run db:generate
bun run db:migrate
bun run db:migrate:ci
bun run test:e2e
```

## Project Map (Minimal)

- `src/app/`: App Router pages and layout
- `src/components/ui/`: shadcn primitives
- `src/components/*`: feature components
- `src/lib/actions.ts` + `src/lib/actions/`: server actions
- `src/lib/store/` + `src/lib/sync/`: offline-first state/sync
- `src/db/schema.ts`: Postgres schema source of truth
- `src/db/schema-sqlite.ts`: test-only SQLite schema
- `src/test/`: unit/integration/property tests
- `e2e/`: Playwright tests

## Non-Negotiable Conventions

- Keep server mutations in server actions, then `revalidatePath("/")`.
- Use `"use client"` only when required.
- Use `cn()` from `@/lib/utils` for conditional classes.
- Co-locate tests as `*.test.ts(x)` when practical.
- For schema changes: edit `src/db/schema.ts`, run `bun run db:generate`, commit `drizzle/*` migration output.

## Testing Notes

- `bun test` uses in-memory SQLite automatically.
- E2E requires DB + Playwright setup; use `E2E_TEST_MODE=true` when needed.
- In tests that touch server actions, mock `next/cache` (`revalidatePath`) and AI helpers as needed.

## Auth Bypass (Important)

- Dev bypass is active in development mode; can be customized with `DEV_AUTH_BYPASS_*` env vars.
- Production bypass only works when IP allowlist + HMAC secret are fully configured:
  `AUTH_BYPASS_IPS`, `AUTH_BYPASS_SECRET`, `AUTH_BYPASS_USER_ID`, `AUTH_BYPASS_EMAIL`.
- Only use production bypass behind a trusted proxy/CDN that forwards real client IP.

## Known CI Quirks

- Some property tests are skipped in CI due to Bun parallel/mocking limitations.
- `FAST_CHECK_SEED=12345` is used in CI for deterministic property tests.
- Next.js lockfile root warning can appear; usually non-blocking.

## Definition of Done

- Lint passes.
- Relevant tests pass for changed behavior.
- Build passes for substantial changes.
- New behavior is covered by tests when appropriate.
