# AGENTS.md - Coding Agent Instructions

## Overview

Todo Gemini is an AI-powered daily task planner built with Next.js 16 (App Router), React 19, TypeScript (strict mode), and Neon PostgreSQL via Drizzle ORM. The app features task management with lists, labels, priorities, due dates, recurring tasks, subtasks, dependencies, gamification (XP/levels/achievements), and Gemini AI integration for smart scheduling.

## Quick Reference

| Aspect | Details |
|--------|---------|
| Runtime | Bun 1.0+ |
| Framework | Next.js 16 with App Router |
| Language | TypeScript (strict mode) |
| Database | Neon PostgreSQL (serverless) via Drizzle ORM |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui (new-york style) |
| Path Alias | `@/*` → `./src/*` |

## Build & Validation Commands

**Always run commands in this order for a clean validation:**

```bash
# 1. Install dependencies (always run first)
bun install

# 2. Lint (fast, catches syntax/style issues)
bun lint

# 3. Run tests (uses in-memory SQLite, no setup needed)
bun test

# 4. Database setup (requires DATABASE_URL in .env.local)
bun --env-file=.env.local run db:push

# 5. Build (validates TypeScript compilation and Next.js build)
bun run build
```

### CI Pipeline Replication

The GitHub Actions CI runs four jobs with dependencies. To replicate locally:

```bash
# Lint job
bun install --frozen-lockfile && bun lint

# Unit test job (NODE_ENV=test uses in-memory SQLite automatically)
bun install --frozen-lockfile && bun test

# Build job (requires DATABASE_URL environment variable)
bun install --frozen-lockfile && bun run db:migrate:ci && bun run build

# E2E test job (requires DATABASE_URL and E2E_TEST_MODE)
bun install --frozen-lockfile
bunx playwright install --with-deps chromium
E2E_TEST_MODE=true bunx playwright test
```

### E2E Testing

E2E tests use Playwright and run against a real database with test authentication bypass:

```bash
# Run all E2E tests
bun run test:e2e

# Run E2E tests with UI
bun run test:e2e:ui

# Run E2E tests in headed mode (visible browser)
bun run test:e2e:headed
```

E2E tests are located in `e2e/` and cover:
- Authentication flow (login, logout, protected routes)
- Task creation and completion
- List and label management
- Gamification (XP, streaks)
- Search functionality (latency verification)

## Auth Bypass (Dev + IP Allowlist)

Development mode disables authentication automatically (`NODE_ENV=development`). Customize the dev user with:

```bash
DEV_AUTH_BYPASS_USER_ID=dev_user
DEV_AUTH_BYPASS_EMAIL=dev@local
DEV_AUTH_BYPASS_FIRST_NAME=Dev
DEV_AUTH_BYPASS_LAST_NAME=User
```

Production bypass requires an IP allowlist and HMAC secret. It is ignored unless all required values are set:

```bash
AUTH_BYPASS_IPS=128.76.228.251
AUTH_BYPASS_SECRET=your-long-random-secret-here
AUTH_BYPASS_USER_ID=prod_bypass_user
AUTH_BYPASS_EMAIL=prod-bypass@example.com
```

Security notes:
- Bypass is gated by client IP in middleware and signed with `AUTH_BYPASS_SECRET`.
- The server verifies the signature before trusting the bypass user.
- Use only behind a trusted proxy/CDN that sets the real client IP.
- Separate multiple IPs in `AUTH_BYPASS_IPS` with commas or whitespace.

### Command Notes

- `bun test` - Uses in-memory SQLite via `bun:sqlite` for fast test execution
- `bun --env-file=.env.local run db:push` - Interactive schema push for local development
- `bun run db:generate` - Generate SQL migration files from schema changes
- `bun run db:migrate` - Apply migrations locally
- `bun run db:migrate:ci` - Apply migrations in CI (handles legacy databases)
- `bun run db:seed` - Seeds default data (Inbox list, labels, achievements) - optional for dev
- Tests run in ~2-3 seconds; build takes ~5-10 seconds

### Database Configuration

The application uses Neon PostgreSQL for development and production:

1. Copy `.env.example` to `.env.local`
2. Set `DATABASE_URL` to your Neon connection string
3. Run `bun --env-file=.env.local run db:push` to create/update tables (for local dev)

```bash
# .env.local example
DATABASE_URL=postgresql://user:pass@host.neon.tech/neondb?sslmode=require
```

### Database Migrations

The project uses Drizzle migrations for schema changes:

```bash
# 1. Modify schema in src/db/schema.ts
# 2. Generate migration
bun run db:generate

# 3. Apply migration locally
bun run db:migrate

# 4. Commit the migration files in drizzle/
git add drizzle/*.sql drizzle/meta/
```

Migration files are in `drizzle/` and are applied automatically in CI via `db:migrate:ci`.

### Database Branching

Database branching is handled automatically by the Vercel + Neon integration:
- Each Vercel preview deployment gets its own isolated Neon database branch
- CI automatically runs migrations on preview branches via GitHub Actions
- Branches are automatically created and cleaned up with preview deployments
- See README.md for setup details

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with providers (QueryProvider, ThemeProvider)
│   ├── page.tsx            # Redirects to /inbox
│   ├── globals.css         # Global styles and Tailwind
│   ├── api/                # API routes (test-auth for E2E testing)
│   └── [route]/page.tsx    # Route pages (inbox, today, calendar, etc.)
│
├── components/
│   ├── ui/                 # shadcn/ui primitives (button, dialog, etc.)
│   ├── layout/             # App shell (MainLayout, AppSidebar, MobileNav)
│   ├── tasks/              # Task components (TaskItem, TaskList, TaskDialog)
│   ├── gamification/       # XP bar, achievements, level-up
│   ├── settings/           # Settings dialog and theme switcher
│   ├── sync/               # Offline sync UI (SyncStatus, ConflictDialog)
│   └── providers/          # React Query, SyncProvider, DataLoader
│
├── db/
│   ├── schema.ts           # Drizzle schema definitions for PostgreSQL (source of truth)
│   ├── schema-sqlite.ts    # SQLite schema for in-memory test database
│   ├── index.ts            # Database connection (Neon for prod, in-memory SQLite for tests)
│   └── seed.ts             # Initial data seeding
│
├── hooks/                  # Custom React hooks
│   └── useActionResult.ts  # Hook for handling server action results
│
├── lib/
│   ├── actions.ts          # Server Actions - entry point (re-exports from actions/)
│   ├── actions/            # Server Action modules (tasks, time-tracking, etc.)
│   ├── action-result.ts    # ActionResult type for consistent error handling
│   ├── ai-actions.ts       # AI-powered features (Gemini)
│   ├── analytics.ts        # Analytics data fetching and calculation
│   ├── auth.ts             # Authentication helpers (getCurrentUser, requireAuth)
│   ├── gamification.ts     # XP/level calculations
│   ├── smart-scheduler.ts  # AI task scheduling
│   ├── smart-tags.ts       # Auto-tagging logic
│   ├── time-export.ts      # Time tracking export functionality
│   ├── utils.ts            # Utility functions (cn helper)
│   ├── store/              # Zustand stores with IndexedDB persistence
│   │   ├── task-store.ts   # Client-side task cache
│   │   ├── list-store.ts   # Client-side list cache
│   │   └── label-store.ts  # Client-side label cache
│   └── sync/               # Offline-first sync system
│       ├── db.ts           # IndexedDB queue + cache stores
│       ├── types.ts        # PendingAction, SyncStatus, ConflictInfo
│       └── registry.ts     # Action type → Server Action mapping
│
└── test/
    ├── setup.ts            # Test configuration, DB helpers, mocks
    ├── integration/        # Integration tests
    └── properties/         # Property-based tests (fast-check)

e2e/                        # Playwright E2E tests
├── fixtures.ts             # Test utilities and authentication helpers
├── authentication.spec.ts  # Auth flow tests
├── task-creation.spec.ts   # Task creation tests
├── task-completion.spec.ts # Task completion tests
└── list-label-management.spec.ts  # List/label tests
```

## Key Conventions

### Server Actions Pattern

All database operations go through `src/lib/actions.ts` using `"use server"` directive:

```typescript
// src/lib/actions.ts
"use server";
import { db } from "@/db";
import { revalidatePath } from "next/cache";

export async function createTask(data: typeof tasks.$inferInsert) {
    const result = await db.insert(tasks).values(data).returning();
    revalidatePath("/");
    return result[0];
}
```

### Component Patterns

- Use `"use client"` directive only when needed (interactivity, hooks, browser APIs)
- UI primitives in `src/components/ui/` follow shadcn/ui patterns
- Use `cn()` utility from `@/lib/utils` for conditional Tailwind classes
- Tests co-located as `*.test.tsx` files

### Offline-First Sync Architecture

The app uses an optimistic UI pattern with background sync:

1. **Zustand Stores** (`src/lib/store/`) - Client-side cache for tasks, lists, labels with IndexedDB persistence
2. **SyncProvider** (`src/components/providers/sync-provider.tsx`) - Manages pending action queue and optimistic updates
3. **Action Registry** (`src/lib/sync/registry.ts`) - Maps action types to Server Actions
4. **IndexedDB** (`src/lib/sync/db.ts`) - Persists pending actions and entity caches

**Flow:**
1. User action → `dispatch(actionType, ...args)` → Optimistic update to store
2. Action queued in IndexedDB → Background sync when online
3. On success: Replace temp IDs with real IDs
4. On conflict: Show `ConflictDialog` for resolution

**Key components:**
- `SyncStatus` - Shows online/offline/syncing status
- `ConflictDialog` - Resolves conflicts with "Keep Mine", "Use Server", "Merge" options
- `DataLoader` - Initializes stores and fetches fresh data

### Database Schema

Schema defined in `src/db/schema.ts` using Drizzle ORM with PostgreSQL types. Key tables:
- `tasks` - Main task table with all fields
- `lists` - Task lists (Inbox is default)
- `labels` - Task labels/tags
- `taskLabels` - Many-to-many junction table
- `timeEntries` - Time tracking logs (manual & timer)
- `userStats` - XP, level, streaks (singleton row)
- `achievements` / `userAchievements` - Gamification

Note: `src/db/schema-sqlite.ts` contains a SQLite-compatible version of the schema used only for in-memory testing.

### Testing

Tests use Bun's test runner with in-memory SQLite:

```typescript
import { describe, it, expect, beforeEach } from "bun:test";
import { setupTestDb, resetTestDb } from "@/test/setup";

describe("Feature", () => {
    beforeEach(async () => {
        await setupTestDb();
        await resetTestDb();
    });
    
    it("should work", async () => {
        // Test code
    });
});
```

**Important:** Mock `next/cache` and AI modules in tests:
```typescript
import { mock } from "bun:test";
mock.module("next/cache", () => ({ revalidatePath: () => {} }));
mock.module("./smart-tags", () => ({
    suggestMetadata: mock(() => Promise.resolve({ listId: null, labelIds: [] }))
}));
```

## Configuration Files

| File | Purpose |
|------|---------|
| `drizzle.config.ts` | Drizzle ORM config for PostgreSQL (schema at `src/db/schema.ts`) |
| `playwright.config.ts` | Playwright E2E test configuration |
| `.env.local` | Local environment variables (DATABASE_URL for Neon) |
| `.env.example` | Template for environment variables |
| `components.json` | shadcn/ui configuration (new-york style) |
| `next.config.ts` | Next.js config with PWA and React Compiler enabled |
| `tsconfig.json` | TypeScript config with `@/*` path alias |
| `eslint.config.mjs` | ESLint with Next.js rules |

## Common Patterns

### Adding a New Server Action

1. Add function to `src/lib/actions.ts` with `"use server"` at file top
2. Use Drizzle ORM for database operations
3. Call `revalidatePath("/")` after mutations
4. Add tests in `src/lib/actions.test.ts`

### Adding a New Component

1. Create in appropriate `src/components/` subdirectory
2. Add `"use client"` if using hooks/interactivity
3. Use shadcn/ui primitives from `@/components/ui/`
4. Add co-located test file `ComponentName.test.tsx`

### Adding a New Route

1. Create `src/app/[route]/page.tsx`
2. Use Server Components for data fetching
3. Import server actions directly in Server Components

## Known Issues & Workarounds

1. **Integration test skipped in CI**: `src/test/integration/task-flow.test.ts` is skipped in CI due to race conditions with parallel execution. Unit tests in `actions.test.ts` cover the same functionality.

2. **Property tests skipped in CI**: The following property tests are skipped in CI due to parallel test execution issues with Bun's module mocking and shared in-memory SQLite database:
   - `src/test/properties/authorization.property.test.ts` - Tests authorization denial (User B cannot access User A's resources)
   - `src/test/properties/data-isolation.property.test.ts` - Tests data isolation between users
   - `src/test/properties/session-security.property.test.ts` - Tests session cookie security and authentication
   - `src/test/properties/server-actions.property.test.ts` - Tests Server Actions error handling with ActionResult types
   
   These tests run successfully locally and verify critical security and error handling properties. The skip is controlled by `CI=true` environment variable.

3. **Property test reproducibility**: All property-based tests use `FAST_CHECK_SEED` environment variable for reproducibility. In CI, this is set to `12345` to ensure consistent test runs.

4. **Next.js workspace root warning**: Build may show a warning about multiple lockfiles. This is cosmetic and doesn't affect the build.

5. **Dialog accessibility warnings**: Some dialogs show "Missing Description" warnings in tests. These are non-blocking.

## Validation Checklist

Before submitting changes, ensure:

- [ ] `bun lint` passes with no errors
- [ ] `bun test` passes all unit tests
- [ ] `bun run test:e2e` passes all E2E tests (requires `E2E_TEST_MODE=true`)
- [ ] `bun run build` completes successfully
- [ ] New code follows existing patterns (Server Actions, component structure)
- [ ] Tests added for new functionality

## Trust These Instructions

These instructions have been validated against the actual codebase. Only perform additional searches if:
- Information appears incomplete for your specific task
- You encounter errors not documented here
- The codebase structure has changed significantly
