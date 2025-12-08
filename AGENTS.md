# AGENTS.md - Coding Agent Instructions

## Overview

Todo Gemini is an AI-powered daily task planner built with Next.js 16 (App Router), React 19, TypeScript (strict mode), and SQLite via Drizzle ORM. The app features task management with lists, labels, priorities, due dates, recurring tasks, subtasks, dependencies, gamification (XP/levels/achievements), and Gemini AI integration for smart scheduling.

## Quick Reference

| Aspect | Details |
|--------|---------|
| Runtime | Bun 1.0+ |
| Framework | Next.js 16 with App Router |
| Language | TypeScript (strict mode) |
| Database | SQLite (`sqlite.db`) via Drizzle ORM |
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

# 4. Database setup (only needed for build/dev, not tests)
bun run db:push

# 5. Build (validates TypeScript compilation and Next.js build)
bun run build
```

### CI Pipeline Replication

The GitHub Actions CI runs three parallel jobs. To replicate locally:

```bash
# Lint job
bun install && bun lint

# Test job (NODE_ENV=test uses in-memory SQLite automatically)
bun install && bun test

# Build job
bun install && bun run db:push && bun run build
```

### Command Notes

- `bun test` - Uses in-memory SQLite via `bun:sqlite`, no database file needed
- `bun run db:push` - Required before `bun build` or `bun dev` (creates/updates `sqlite.db`)
- `bun run db:seed` - Seeds default data (Inbox list, labels, achievements) - optional for dev
- Tests run in ~2-3 seconds; build takes ~5-10 seconds

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout with providers (QueryProvider, ThemeProvider)
│   ├── page.tsx            # Redirects to /inbox
│   ├── globals.css         # Global styles and Tailwind
│   └── [route]/page.tsx    # Route pages (inbox, today, calendar, etc.)
│
├── components/
│   ├── ui/                 # shadcn/ui primitives (button, dialog, etc.)
│   ├── layout/             # App shell (MainLayout, AppSidebar)
│   ├── tasks/              # Task components (TaskItem, TaskList, TaskDialog)
│   ├── gamification/       # XP bar, achievements, level-up
│   ├── settings/           # Settings dialog and theme switcher
│   └── providers/          # React Query provider
│
├── db/
│   ├── schema.ts           # Drizzle schema definitions (source of truth)
│   ├── index.ts            # Database connection (auto-switches to in-memory for tests)
│   └── seed.ts             # Initial data seeding
│
├── lib/
│   ├── actions.ts          # Server Actions - ALL database operations
│   ├── ai-actions.ts       # AI-powered features (Gemini)
│   ├── gamification.ts     # XP/level calculations
│   ├── smart-scheduler.ts  # AI task scheduling
│   ├── smart-tags.ts       # Auto-tagging logic
│   └── utils.ts            # Utility functions (cn helper)
│
└── test/
    ├── setup.ts            # Test configuration, DB helpers, mocks
    └── integration/        # Integration tests
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

### Database Schema

Schema defined in `src/db/schema.ts` using Drizzle ORM. Key tables:
- `tasks` - Main task table with all fields
- `lists` - Task lists (Inbox is default)
- `labels` - Task labels/tags
- `taskLabels` - Many-to-many junction table
- `userStats` - XP, level, streaks (singleton row)
- `achievements` / `userAchievements` - Gamification

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
| `drizzle.config.ts` | Drizzle ORM config (schema at `src/db/schema.ts`) |
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

2. **Next.js workspace root warning**: Build may show a warning about multiple lockfiles. This is cosmetic and doesn't affect the build.

3. **Dialog accessibility warnings**: Some dialogs show "Missing Description" warnings in tests. These are non-blocking.

## Validation Checklist

Before submitting changes, ensure:

- [ ] `bun lint` passes with no errors
- [ ] `bun test` passes all tests
- [ ] `bun run build` completes successfully
- [ ] New code follows existing patterns (Server Actions, component structure)
- [ ] Tests added for new functionality

## Trust These Instructions

These instructions have been validated against the actual codebase. Only perform additional searches if:
- Information appears incomplete for your specific task
- You encounter errors not documented here
- The codebase structure has changed significantly
