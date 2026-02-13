# Convex Migration Plan: Todo Gemini

> **Migrating from**: Neon PostgreSQL + Drizzle ORM + Next.js Server Actions + WorkOS AuthKit + Zustand/IndexedDB offline sync
> **Migrating to**: Convex (database, real-time sync, backend functions, scheduling) + Convex Auth or WorkOS via Convex
> **Estimated effort**: 8–12 weeks for a team of 1–2 engineers (includes required spikes)

IMPORTANT: Use the Convex MCP for any Convex doubts or questions or clarifications.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Architecture Analysis](#2-current-architecture-analysis)
3. [Target Architecture](#3-target-architecture)
4. [Migration Phases](#4-migration-phases)
   - [Phase 0: Setup & Infrastructure](#phase-0-setup--infrastructure)
   - [Phase 1: Schema & Data Layer](#phase-1-schema--data-layer)
   - [Phase 2: Server Actions → Convex Functions](#phase-2-server-actions--convex-functions)
   - [Phase 3: Authentication](#phase-3-authentication)
   - [Phase 4: Real-Time & Client Integration](#phase-4-real-time--client-integration)
   - [Phase 5: AI Features (Gemini Actions)](#phase-5-ai-features-gemini-actions)
   - [Phase 6: Offline Sync Removal](#phase-6-offline-sync-removal)
   - [Phase 7: External Integrations](#phase-7-external-integrations)
   - [Phase 8: Testing & Cleanup](#phase-8-testing--cleanup)
5. [Schema Translation Reference](#5-schema-translation-reference)
6. [Function Migration Map](#6-function-migration-map)
7. [What Gets Removed](#7-what-gets-removed)
8. [Risk Assessment](#8-risk-assessment)
9. [Rollback Strategy](#9-rollback-strategy)

---

## 0. Required Pre-Implementation Spikes

> ⚠️ **Do NOT begin feature migration until all spikes pass.** These validate assumptions the rest of the plan depends on.

### Spike 1: Auth Proof-of-Concept (1 day)

Stand up a minimal Convex project using the **official `@convex-dev/workos-authkit` integration** (https://www.convex.dev/components/workos-authkit) (NOT the custom token-template approach):

1. Verify the client can obtain a JWT acceptable to Convex via WorkOS AuthKit.
2. Confirm `ctx.auth.getUserIdentity()` returns non-null with a stable `subject` matching the WorkOS user ID.
3. Confirm client-only `useQuery` loading for authenticated pages (skip SSR `preloadQuery`).
4. Verify in both local dev and a staging deployment.

**Why this is blocking:** WorkOS AuthKit uses session-cookie auth, not bearer tokens. The approach for bridging this to Convex's JWT-based auth must be proven before any function migration.

### Spike 1b: Test Runner Compatibility (0.5 day)

Verify `convex-test` runs successfully under `bun test` in this repo. If it fails, plan to switch Convex unit tests to Vitest and update imports, scripts, and CI accordingly.

### Spike 2: Constraint Parity Matrix (1–2 days)

Create a written document mapping every Postgres PK/FK/unique/cascade to its Convex enforcement strategy:

- Every unique constraint → mutation-level check with indexed query + `.unique()`
- Every cascade → explicit delete chain (with batching for large datasets)
- Every composite FK → ownership validation in mutation code
- Every composite PK → dedupe pattern in junction table mutations

### Spike 3: Cascade Delete + Transaction Limits (1 day)

Build and test a prototype `deleteList` that cascades through tasks → subtasks → taskLabels → dependencies → reminders → habitCompletions → timeEntries → logs. Verify it works for a list with 200+ tasks without hitting Convex mutation time/document limits. Design the batched-delete pattern (using `ctx.scheduler`) that all cascades will follow.

### Spike 4: Offline/PWA Decision (0.5 day)

**Decision:** Accept regression. The app will be online-only after migration. Remove PWA offline claims and update the service worker to show an "offline" UI state.

### Spike 5: Encryption Approach (0.5 day)

**Decision:** Use Convex environment variables for key management and a pure-JS encryption library in Convex actions. Avoid AWS KMS for simplicity.

If stricter key management is required later, move encryption/decryption to a Convex action that proxies to a separate service, or reintroduce KMS.

---

## 1. Executive Summary

### Why Convex?

| Current Pain Point                                                              | Convex Solution                                                                                                                               |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Custom offline-first sync system (Zustand + IndexedDB + SyncProvider)           | Convex handles real-time sync automatically via WebSocket subscriptions. **⚠️ Note: This is NOT an offline-first replacement — see Spike 4.** |
| Manual `revalidatePath` after every mutation                                    | `useQuery` subscriptions update UI automatically                                                                                              |
| Separate SQLite schema for tests                                                | Convex has built-in testing utilities; no schema duplication                                                                                  |
| Complex Server Action boilerplate (`"use server"`, auth checks, error handling) | Convex mutations with built-in auth context (`ctx.auth`)                                                                                      |
| No real-time updates without polling or manual refresh                          | Every `useQuery` is a live subscription                                                                                                       |
| React Query for client-side caching                                             | Replaced by Convex's reactive cache                                                                                                           |

### What Changes

- **Database**: Neon PostgreSQL → Convex document database
- **ORM**: Drizzle ORM → Convex's built-in `ctx.db` API
- **Backend functions**: Next.js Server Actions + API routes → Convex queries/mutations/actions only
- **Auth**: WorkOS AuthKit middleware → WorkOS JWT verification in Convex via official `@convex-dev/workos-authkit` package (https://www.convex.dev/components/workos-authkit)
- **Client data**: Zustand stores + React Query + IndexedDB → Convex `useQuery`/`useMutation` hooks (no custom caches)
- **Offline sync**: Custom SyncProvider → Remove offline queue (online-only after migration per Spike 4 decision).
- **View settings**: Move to client-only state (keep saved views in Convex).
- **Views logic**: Compute views client-side from Convex data; remove server-side view composition.
- **Audit logs**: Drop `taskLogs` if audit history is not required.
- **AI features**: Server Actions calling Gemini → Convex actions calling Gemini
- **Background workflows**: Move all recurring jobs and cleanup to `convex/crons.ts` + internal actions

### What Stays the Same

- Next.js 16 App Router (pages, layouts, routing)
- React 19 components and UI
- shadcn/ui component library
- Tailwind CSS v4 styling
- Gamification logic (pure functions in `gamification.ts`)
- UI components (`src/components/`)
- E2E tests (Playwright, adapted for Convex)

---

## 2. Current Architecture Analysis

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App Router                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Server Comps  │  │ Client Comps  │  │  Middleware    │  │
│  │ (data fetch)  │  │ (interactivity│  │  (WorkOS)     │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────────┘  │
│         │                 │                               │
│  ┌──────▼─────────────────▼──────┐                       │
│  │     Server Actions (actions/) │                       │
│  │  tasks, lists, labels, views  │                       │
│  │  gamification, time-tracking  │                       │
│  │  templates, search, AI, sync  │                       │
│  └──────────────┬────────────────┘                       │
│                 │                                         │
│  ┌──────────────▼────────────────┐                       │
│  │   Drizzle ORM (db/index.ts)   │                       │
│  │   schema.ts | schema-sqlite   │                       │
│  └──────────────┬────────────────┘                       │
│                 │                                         │
│  ┌──────────────▼───┐  ┌─────────────────────────────┐  │
│  │  Neon PostgreSQL  │  │  Client-Side Sync Layer     │  │
│  │  (production)     │  │  Zustand + IndexedDB +      │  │
│  │  SQLite (tests)   │  │  SyncProvider + React Query │  │
│  └──────────────────┘  └─────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Database Tables (19 total)

| Table                   | Rows/User | Relationships                        | Notes                            |
| ----------------------- | --------- | ------------------------------------ | -------------------------------- |
| `users`                 | 1         | Parent of all                        | WorkOS user data + preferences   |
| `tasks`                 | Many      | → lists, self-referencing (parentId) | Core entity, 12+ indexed columns |
| `lists`                 | ~5-20     | → users                              | Task groupings                   |
| `labels`                | ~5-20     | → users                              | Tag system                       |
| `taskLabels`            | Many      | → tasks, labels                      | Junction table (M2M)             |
| `taskDependencies`      | Some      | → tasks (self)                       | Junction table (M2M)             |
| `reminders`             | Some      | → tasks                              | Future alerts                    |
| `taskLogs`              | Many      | → users, tasks, lists, labels        | Optional (drop if audit not needed) |
| `habitCompletions`      | Some      | → tasks                              | Habit tracking                   |
| `templates`             | Few       | → users                              | Task templates (JSON content)    |
| `userStats`             | 1         | → users                              | XP, level, streaks               |
| `achievements`          | Static    | —                                    | Global achievement definitions   |
| `userAchievements`      | Some      | → users, achievements                | Junction table                   |
| `viewSettings`          | ~5-10     | → users                              | Move to client-only state if purely UI |
| `savedViews`            | Few       | → users                              | Custom saved view configs        |
| `timeEntries`           | Many      | → tasks, users                       | Work session tracking            |
| `rateLimits`            | Transient | —                                    | Remove (use Convex limits)       |
| `customIcons`           | Few       | → users                              | User-uploaded icons              |
| `externalIntegrations`  | Few       | → users                              | Todoist/Google Tasks tokens      |
| `externalSyncState`     | Few       | → users                              | Sync cursor state                |
| `externalEntityMap`     | Many      | → users                              | ID mapping for external sync     |
| `externalSyncConflicts` | Few       | → users                              | Unresolved sync conflicts        |

### Server Action Modules (20+ files)

- `tasks/` (queries, mutations, subtasks, streak)
- `lists.ts`, `labels.ts`
- `gamification.ts`, `time-tracking.ts`
- `search.ts`, `view-settings.ts` (optional if view settings are client-only), `views.ts` (server-side view logic removed)
- `templates.ts`, `reminders.ts`, `dependencies.ts`, `logs.ts` (drop if audit logs are removed)
- `task-safe.ts` (Zod-validated wrappers)
- `todoist.ts`, `google-tasks.ts` (external integrations)
- `user.ts`, `custom-icons.ts`, `data-migration.ts`

---

## 3. Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App Router                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Server Comps  │  │ Client Comps  │  │  Middleware    │  │
│  │ (shell only)  │  │ (useQuery,   │  │  (Convex Auth  │  │
│  │               │  │  useMutation) │  │   or WorkOS)  │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────────┘  │
│         │                 │                               │
│         │     ┌───────────▼──────────┐                   │
│         │     │  ConvexProvider      │                   │
│         │     │  (WebSocket client)  │                   │
│         │     └───────────┬──────────┘                   │
│         │                 │                               │
└─────────┼─────────────────┼───────────────────────────────┘
          │                 │ (WebSocket)
          │   ┌─────────────▼──────────────────────┐
          │   │         Convex Backend              │
          │   │  ┌─────────┐ ┌──────────┐ ┌──────┐ │
          │   │  │ Queries  │ │ Mutations│ │Actions│ │
          │   │  │ (read)   │ │ (write)  │ │(APIs)│ │
          │   │  └────┬─────┘ └────┬─────┘ └──┬───┘ │
          │   │       │            │           │     │
          │   │  ┌────▼────────────▼───────────▼──┐  │
          │   │  │      Convex Document DB         │  │
          │   │  │   (ACID, real-time, indexed)    │  │
          │   │  └────────────────────────────────┘  │
          │   │                                      │
          │   │  ┌────────────────────┐              │
          │   │  │  Scheduled Jobs    │              │
          │   │  │  (crons, delayed)  │              │
          │   │  └────────────────────┘              │
          │   └──────────────────────────────────────┘
          │
          └── Client-only queries (no SSR preload)
```

### Key Benefits of Target Architecture

1. **No sync layer** — Convex `useQuery` is inherently real-time; no Zustand, IndexedDB, or SyncProvider needed
2. **No `revalidatePath`** — Mutations automatically trigger re-renders for all subscribed queries
3. **No dual schema** — One Convex schema for dev, prod, and tests
4. **No React Query** — Convex's reactive system replaces TanStack Query entirely
5. **Built-in auth context** — `ctx.auth.getUserIdentity()` in every function
6. **Optimistic updates** — Built into `useMutation` without custom plumbing
7. **Type-safe end-to-end** — Auto-generated `api` object for fully typed function calls

---

## 4. Migration Phases

### Phase 0: Setup & Infrastructure

**Duration**: 1 day

#### 0.1 Install Convex

```bash
bun add convex
bunx convex init
```

This creates:

- `convex/` directory with `_generated/`, `tsconfig.json`
- `.env.local` updated with `NEXT_PUBLIC_CONVEX_URL`

#### 0.2 Configure Development

```bash
# Terminal 1: Convex dev server (watches convex/ directory)
bunx convex dev

# Terminal 2: Next.js dev server
bun run dev
```

Add scripts to `package.json` (requires `bun add -D concurrently`):

```json
{
  "scripts": {
    "dev:convex": "convex dev",
    "dev:next": "bun run --bun next dev",
    "dev": "concurrently \"bun run dev:convex\" \"bun run dev:next\""
  }
}
```

#### 0.3 Set Up ConvexProvider (Auth-Ready)

Create `src/components/providers/ConvexClientProvider.tsx` using the **official `@convex-dev/workos-authkit` package** (https://www.convex.dev/components/workos-authkit) — NOT a custom token-template approach.

> ⚠️ **The `getAccessToken({ template: "convex" })` pattern shown in earlier drafts is a Clerk API, not WorkOS.** WorkOS AuthKit uses session-cookie auth. Use the official integration package instead.

```bash
bun add @convex-dev/workos-authkit
```

```tsx
"use client";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos-authkit";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ConvexProviderWithAuthKit client={convex}>
      {children}
    </ConvexProviderWithAuthKit>
  );
}
```

Wrap in `src/app/layout.tsx` alongside existing providers (can co-exist during migration).

> **Important:** If `@convex-dev/workos-authkit` does not support your WorkOS AuthKit version, you must build a custom bridge (see Spike 1). The bridge must: (1) extract a JWT from the WorkOS session server-side, (2) expose it to the Convex client for WebSocket auth, and (3) handle token refresh. This is the highest-risk integration point in the entire migration.

#### 0.4 Environment Variables

Move secrets to Convex dashboard:

```bash
bunx convex env set GEMINI_API_KEY <value>
bunx convex env set WORKOS_API_KEY <value>
bunx convex env set WORKOS_CLIENT_ID <value>
# ... etc
```

#### 0.5 Auth Token Validation (Required)

Convex validates tokens by matching `iss` (domain) and `aud` (applicationID). Verify these by decoding a real WorkOS ID token and matching `iss`/`aud` exactly.

#### 0.6 WorkOS Token Flow (Required — Determined by Spike 1)

> ⚠️ **This section must be rewritten after Spike 1 completes.** The exact token flow depends on which integration approach works with your WorkOS AuthKit version.

Convex needs a JWT to authenticate WebSocket connections. WorkOS AuthKit primarily uses **session cookies**, not bearer tokens. The bridge between these two models is the highest-risk integration point.

**Possible approaches (validate in Spike 1):**

1. **Official `@convex-dev/workos-authkit` package** (preferred; see https://www.convex.dev/components/workos-authkit)
2. **Custom `useAuth` hook** that calls a Next.js API route to exchange the WorkOS session for a JWT (only if the official integration is not viable; goal is no API routes):

```ts
// src/app/api/convex-token/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";

export async function GET() {
  const { user, accessToken } = await withAuth();
  if (!user || !accessToken) {
    return NextResponse.json({ token: null }, { status: 401 });
  }

  // Return the WorkOS access token (JWT) for Convex to validate.
  // Verify that this JWT has the correct `iss` and `aud` claims
  // that match your convex/auth.config.ts configuration.
  return NextResponse.json({ token: accessToken });
}
```

3. **Clerk migration** (Option B in Phase 3) — avoids the bridging problem entirely.

**Critical verification steps (before proceeding past this phase):**

- Decode the actual JWT from WorkOS and verify `iss`/`aud` match Convex config.
- Confirm the token is an OIDC-compatible JWT (not an opaque session token).
- Confirm `ctx.auth.getUserIdentity()` returns non-null in a Convex mutation.
- Confirm token refresh works without forcing page reloads.

#### 0.6.1 SSR Strategy (Simplified)

Skip SSR `preloadQuery` for authenticated pages to avoid token forwarding complexity. Treat all authenticated pages as client-only `useQuery` views.

#### 0.7 Auth Verification Checklist (Required)

Before writing any Convex functions, validate the following with a real WorkOS token:

- `iss` matches the `domain` configured in `convex/auth.config.ts`
- `aud` matches the `applicationID`
- Token is an OIDC ID token (not an access token)
- `ctx.auth.getUserIdentity()` returns a non-null identity in a simple test mutation

---

### Phase 1: Schema & Data Layer

**Duration**: 2–3 days

#### 1.1 Create Convex Schema

Create `convex/schema.ts` translating all 19+ Drizzle tables. Preserve `createdAt` where it is used for sorting or analytics, and denormalize `userId` on child/junction tables to avoid N+1 queries. Favor denormalized counters updated in mutations instead of batch analytics jobs.

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Users ──────────────────────────────────────────────
  users: defineTable({
    externalId: v.string(), // WorkOS user ID
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    isInitialized: v.boolean(),
    use24HourClock: v.optional(v.boolean()),
    weekStartsOnMonday: v.optional(v.boolean()),
    calendarUseNativeTooltipsOnDenseDays: v.optional(v.boolean()),
    calendarDenseTooltipThreshold: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_externalId", ["externalId"])
    .index("by_email", ["email"]),

  // ─── Lists ──────────────────────────────────────────────
  lists: defineTable({
    userId: v.id("users"),
    name: v.string(),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    slug: v.string(),
    description: v.optional(v.string()),
    position: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_slug", ["userId", "slug"]),

  // ─── Tasks ──────────────────────────────────────────────
  tasks: defineTable({
    userId: v.id("users"),
    listId: v.optional(v.id("lists")),
    title: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    priority: v.union(
      v.literal("none"),
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
    ),
    dueDate: v.optional(v.number()), // timestamp ms
    dueDatePrecision: v.optional(
      v.union(
        v.literal("day"),
        v.literal("week"),
        v.literal("month"),
        v.literal("year"),
      ),
    ),
    isCompleted: v.boolean(),
    completedAt: v.optional(v.number()),
    isRecurring: v.boolean(),
    recurringRule: v.optional(v.string()), // RRule string
    parentId: v.optional(v.id("tasks")), // For subtasks
    estimateMinutes: v.optional(v.number()),
    position: v.number(),
    actualMinutes: v.optional(v.number()),
    energyLevel: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    ),
    context: v.optional(
      v.union(
        v.literal("computer"),
        v.literal("phone"),
        v.literal("errands"),
        v.literal("meeting"),
        v.literal("home"),
        v.literal("anywhere"),
      ),
    ),
    isHabit: v.boolean(),
    deadline: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_list", ["userId", "listId"])
    .index("by_parent", ["parentId"])
    .index("by_completed", ["userId", "isCompleted"])
    .index("by_dueDate", ["userId", "dueDate"])
    .index("by_completedAt", ["userId", "isCompleted", "completedAt"])
    .index("by_listView", ["userId", "listId", "isCompleted", "position"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["userId"],
    })
    .searchIndex("search_description", {
      searchField: "description",
      filterFields: ["userId"],
    }),

  // ─── Labels ─────────────────────────────────────────────
  labels: defineTable({
    userId: v.id("users"),
    name: v.string(),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    position: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // ─── Task Labels (Junction) ─────────────────────────────
  taskLabels: defineTable({
    userId: v.id("users"),
    taskId: v.id("tasks"),
    labelId: v.id("labels"),
  })
    .index("by_task", ["taskId"])
    .index("by_label", ["labelId"]),

  // ─── Task Dependencies (Junction) ───────────────────────
  taskDependencies: defineTable({
    userId: v.id("users"),
    taskId: v.id("tasks"),
    blockerId: v.id("tasks"),
  })
    .index("by_task", ["taskId"])
    .index("by_blocker", ["blockerId"]),

  // ─── Reminders ──────────────────────────────────────────
  reminders: defineTable({
    userId: v.id("users"),
    taskId: v.id("tasks"),
    remindAt: v.number(),
    isSent: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_remindAt", ["isSent", "remindAt"]),

  // ─── Task Logs ──────────────────────────────────────────
  // Optional: drop taskLogs if audit history is not required
  taskLogs: defineTable({
    userId: v.id("users"),
    taskId: v.optional(v.id("tasks")),
    listId: v.optional(v.id("lists")),
    labelId: v.optional(v.id("labels")),
    action: v.string(),
    details: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_task", ["taskId"]),

  // ─── Habit Completions ──────────────────────────────────
  habitCompletions: defineTable({
    userId: v.id("users"),
    taskId: v.id("tasks"),
    completedAt: v.number(),
    createdAt: v.number(),
  }).index("by_task_date", ["taskId", "completedAt"]),

  // ─── Templates ──────────────────────────────────────────
  templates: defineTable({
    userId: v.id("users"),
    name: v.string(),
    content: v.string(), // JSON string of task data
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // ─── User Stats ─────────────────────────────────────────
  userStats: defineTable({
    userId: v.id("users"),
    xp: v.number(),
    level: v.number(),
    lastLogin: v.optional(v.number()),
    currentStreak: v.number(),
    longestStreak: v.number(),
    streakFreezes: v.number(),
  }).index("by_user", ["userId"]),

  // ─── Achievements ──────────────────────────────────────
  // ⚠️ NOTE: In Postgres, achievements.id is a text PK (e.g., "first_task").
  // In Convex, the PK is the auto-generated _id. The achievementId field
  // stores the logical string ID for lookups and migration mapping.
  achievements: defineTable({
    achievementId: v.string(), // Logical ID (e.g., "first_task")
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    conditionType: v.string(),
    conditionValue: v.number(),
    xpReward: v.number(),
  }).index("by_achievementId", ["achievementId"]),

  // ─── User Achievements ─────────────────────────────────
  // ⚠️ IMPORTANT: achievementId here is v.id("achievements") (Convex doc ID),
  // NOT the logical string ID. During data migration, you must:
  // 1. Insert all achievements first
  // 2. Build a map: logical achievementId string → Convex _id
  // 3. Use the Convex _id when inserting userAchievements
  // All code that previously compared achievement IDs as strings must be updated
  // to use Convex doc IDs or look up via the by_achievementId index.
  userAchievements: defineTable({
    userId: v.id("users"),
    achievementId: v.id("achievements"),
    unlockedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_achievement", ["userId", "achievementId"]),

  // ─── View Settings ─────────────────────────────────────
  // Optional: move to client-only state if view settings are purely UI
  viewSettings: defineTable({
    userId: v.id("users"),
    viewId: v.string(),
    layout: v.optional(
      v.union(v.literal("list"), v.literal("board"), v.literal("calendar")),
    ),
    showCompleted: v.optional(v.boolean()),
    groupBy: v.optional(
      v.union(
        v.literal("none"),
        v.literal("dueDate"),
        v.literal("priority"),
        v.literal("label"),
      ),
    ),
    sortBy: v.optional(
      v.union(
        v.literal("manual"),
        v.literal("dueDate"),
        v.literal("priority"),
        v.literal("name"),
        v.literal("created"),
      ),
    ),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    filterDate: v.optional(
      v.union(v.literal("all"), v.literal("hasDate"), v.literal("noDate")),
    ),
    filterPriority: v.optional(v.string()),
    filterLabelId: v.optional(v.id("labels")),
    filterEnergyLevel: v.optional(
      v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
    ),
    filterContext: v.optional(
      v.union(
        v.literal("computer"),
        v.literal("phone"),
        v.literal("errands"),
        v.literal("meeting"),
        v.literal("home"),
        v.literal("anywhere"),
      ),
    ),
    updatedAt: v.optional(v.number()),
  }).index("by_user_view", ["userId", "viewId"]),

  // ─── Saved Views ────────────────────────────────────────
  savedViews: defineTable({
    userId: v.id("users"),
    name: v.string(),
    icon: v.optional(v.string()),
    settings: v.string(), // JSON string
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // ─── Time Entries ───────────────────────────────────────
  timeEntries: defineTable({
    taskId: v.id("tasks"),
    userId: v.id("users"),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    notes: v.optional(v.string()),
    isManual: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_user", ["userId"])
    .index("by_startedAt", ["userId", "startedAt"]),

  // ─── Custom Icons ───────────────────────────────────────
  customIcons: defineTable({
    userId: v.id("users"),
    name: v.string(),
    url: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // ─── External Integrations ──────────────────────────────
  externalIntegrations: defineTable({
    userId: v.id("users"),
    provider: v.union(v.literal("todoist"), v.literal("google_tasks")),
    accessTokenEncrypted: v.string(),
    accessTokenIv: v.string(),
    accessTokenTag: v.string(),
    accessTokenKeyId: v.string(),
    refreshTokenEncrypted: v.optional(v.string()),
    refreshTokenIv: v.optional(v.string()),
    refreshTokenTag: v.optional(v.string()),
    scopes: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_provider", ["userId", "provider"]),

  // ─── External Sync State ───────────────────────────────
  externalSyncState: defineTable({
    userId: v.id("users"),
    provider: v.union(v.literal("todoist"), v.literal("google_tasks")),
    syncToken: v.optional(v.string()),
    lastSyncedAt: v.optional(v.number()),
    status: v.union(
      v.literal("idle"),
      v.literal("syncing"),
      v.literal("error"),
    ),
    error: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_provider", ["userId", "provider"]),

  // ─── External Entity Map ───────────────────────────────
  externalEntityMap: defineTable({
    userId: v.id("users"),
    provider: v.union(v.literal("todoist"), v.literal("google_tasks")),
    entityType: v.union(
      v.literal("task"),
      v.literal("list"),
      v.literal("label"),
      v.literal("list_label"),
    ),
    localId: v.optional(v.string()), // Convex ID as string
    externalId: v.string(),
    externalParentId: v.optional(v.string()),
    externalEtag: v.optional(v.string()),
    externalUpdatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    // ⚠️ FIXED: Must include entityType to match Postgres unique constraint
    // (userId, provider, entityType, externalId). Without entityType, different
    // entity types sharing the same externalId will collide.
    .index("by_externalId", ["userId", "provider", "entityType", "externalId"])
    .index("by_localId", ["localId"]),

  // ─── External Sync Conflicts ───────────────────────────
  externalSyncConflicts: defineTable({
    userId: v.id("users"),
    provider: v.union(v.literal("todoist"), v.literal("google_tasks")),
    entityType: v.union(
      v.literal("task"),
      v.literal("list"),
      v.literal("label"),
    ),
    localId: v.optional(v.string()),
    externalId: v.optional(v.string()),
    conflictType: v.string(),
    localPayload: v.optional(v.string()),
    externalPayload: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("resolved")),
    resolution: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["userId", "status"]),

  // ─── Rate Limits ────────────────────────────────────────
  // rateLimits table removed (use Convex limits or per-user throttling in mutations)
});
```

#### 1.2 Key Schema Decisions

| Decision                                 | Rationale                                                                                                                                                                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Timestamps as `v.number()`**           | Convex stores timestamps as milliseconds (numbers). Use `Date.now()` in mutations. Keep explicit `createdAt` fields where the app sorts or filters by creation time; `_creationTime` is available but not a full replacement. |
| **`v.id("table")` for foreign keys**     | Type-safe references. No cascading deletes — handle in mutations.                                                                                                                                                             |
| **Keep junction tables**                 | `taskLabels` and `taskDependencies` remain as separate tables with indexes on both sides.                                                                                                                                     |
| **`externalId` on users**                | Store WorkOS user ID as `externalId`, use Convex's `_id` as the internal reference everywhere.                                                                                                                                |
| **Search indexes on tasks**              | Replace PostgreSQL text indexes with Convex `searchIndex` for full-text search. **Simplification:** accept basic Convex search and remove Fuse.js.                                                        |
| **No rate limits table (future)**        | Drop the rateLimits table and rely on Convex limits + a simple per-user throttle in mutations if needed.                                                                                                                  |
| **Denormalize `userId` on child tables** | Avoid N+1 queries and simplify access control checks in Convex (no joins).                                                                                                                                                    |

#### 1.2.1 ⚠️ User ID Strategy — Breaking Change

> **This is the single highest-impact schema change in the migration.**

Current system: `users.id` = WorkOS user ID (text primary key). Every FK, access check, and client reference uses this string directly.

Convex system: `users._id` = auto-generated Convex ID. WorkOS user ID stored as `externalId`.

**Impact on every table and function:**

- All `userId` foreign keys change type from `string` (WorkOS ID) to `Id<"users">` (Convex ID).
- Every access control check (`resource.userId === auth.user.id`) must be updated to use Convex IDs.
- External integrations, logs, and sync state that store `userId` must use Convex IDs internally.
- Client-side code that references user IDs (e.g., URLs, local storage keys) must be updated.
- **If you miss ONE comparison**, you get a cross-tenant data leak.

**Mitigation:**

- Create a `getUserByExternalId` helper used in every mutation/query (already in helpers.ts plan).
- Audit every access check during migration — add this to the constraint parity matrix (Spike 2).
- Never expose or compare `externalId` outside of the user lookup helper.

#### 1.2.2 ⚠️ Lost Relational Constraints

The following Postgres guarantees are **silently dropped** in Convex and must be enforced in application code:

| Postgres Constraint                                                    | Convex Replacement                                                                                                              | Risk if Missed                               |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `ON DELETE CASCADE` on ~12 FKs                                         | Manual cascade in mutation code                                                                                                 | Orphaned documents, broken UI, storage leaks |
| Composite FK `(tasks.listId, tasks.userId) → (lists.id, lists.userId)` | Ownership check in every mutation touching `listId`                                                                             | Task assigned to another user's list (IDOR)  |
| `UNIQUE(userId, slug)` on lists                                        | Check-then-insert in mutation                                                                                                   | Duplicate list slugs, broken routing         |
| `UNIQUE(userId, provider)` on integrations                             | Check-then-insert in mutation                                                                                                   | Duplicate integration rows, token confusion  |
| `UNIQUE(userId, provider, entityType, externalId)` on entity map       | Check-then-insert in mutation                                                                                                   | Wrong sync mapping, data corruption          |
| Composite PKs on junction tables                                       | Indexed query + `.unique()` check before insert                                                                                 | Duplicate junction rows                      |
| `ON CONFLICT DO UPDATE` / `DO NOTHING` (atomic upserts)                | Read-then-write in single mutation (serializable within mutation, but NOT across concurrent requests without careful index use) | Duplicate rows on concurrent requests        |

**Required pattern for uniqueness enforcement:**

```typescript
// Standard pattern: check-then-insert within a mutation (serializable)
export const createList = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const slug = args.name.toLowerCase().replace(/\s+/g, "-");

    // Check uniqueness using indexed query
    const existing = await ctx.db
      .query("lists")
      .withIndex("by_user_slug", (q) => q.eq("userId", user._id).eq("slug", slug))
      .unique();

    if (existing) {
      throw new Error(`List with slug "${slug}" already exists`);
    }

    return await ctx.db.insert("lists", { userId: user._id, name: args.name, slug, ... });
  },
});
```

> **Note:** This pattern is safe within a single Convex mutation (serializable transactions). However, Convex may retry mutations on conflict — ensure all mutations are idempotent-safe.

#### 1.2.3 Search Simplification

Use Convex `searchIndex` for all search. Accept loss of fuzzy matching and client-side instant search to remove Fuse.js and dual search paths.

#### 1.3 Data Migration Script

Create `convex/migrations/` with a one-time migration action:

```typescript
// convex/migrations/importFromPostgres.ts
import { action } from "../_generated/server";
import { internal } from "../_generated/api";

export const importAll = action({
  handler: async (ctx) => {
    // 1. Fetch all data from Neon PostgreSQL via HTTP
    // 2. Transform serial IDs → Convex IDs (build ID map)
    // 3. Insert in dependency order: users → lists → labels → tasks → junction tables
    // 4. Update foreign key references using ID map
    // 5. Chunk and checkpoint to stay under Convex action and transaction limits
  },
});
```

**Important:** Convex actions have a 10-minute limit and queries/mutations have size limits. Plan for chunked imports with a resumable cursor/checkpoint mechanism.

**Implementation notes:**

- Persist `oldId → newId` maps in a Convex table to allow resumable imports.
- Use idempotency keys per batch to avoid double-inserts on retries.
- Record a migration cursor per table in a `migrationState` table.

**Migration order** (respecting foreign keys):

1. `users` → build map: `oldId → newConvexId`
2. `achievements` (no FK dependencies)
3. `lists` → map old serial IDs
4. `labels` → map old serial IDs
5. `tasks` → map old serial IDs, resolve `listId`, `parentId`
6. `taskLabels` → resolve `taskId`, `labelId`
7. `taskDependencies` → resolve both task IDs
8. `reminders`, `habitCompletions` (skip `taskLogs` if audit is dropped)
9. `userStats`, `userAchievements`, `savedViews` (skip `viewSettings` if client-only)
10. `timeEntries`, `templates`, `customIcons`
11. `externalIntegrations`, `externalSyncState`, `externalEntityMap`, `externalSyncConflicts`
12. `rateLimits` (remove; rely on Convex limits)

#### 1.4 Parallel Run + Delta Sync

If you plan to run Postgres and Convex in parallel for weeks, add a delta sync step that replays changes since the initial import. Options:

- Dual-write all mutations and reconcile by source-of-truth timestamps.
- Poll a changelog table in Postgres and apply deltas in Convex.
- Freeze writes briefly during cutover to avoid drift.

**Recommendation:** Prefer a short cutover window with a write freeze + delta import if possible. Keep migration validation inside Convex internal actions to avoid maintaining separate Node scripts.

#### 1.5 Migration Runner Outline (Pseudo)

```ts
// 1) Read batch from Postgres with cursor
const batch = await fetchPostgres({ table: "tasks", cursor, limit: 500 });

// 2) Build/lookup ID maps (persisted in Convex)
const idMap = await ctx.db.query("migrationIdMap").collect();

// 3) Transform rows with mapped IDs
const transformed = batch.map((row) => ({
  userId: idMap.users[row.user_id],
  listId: row.list_id ? idMap.lists[row.list_id] : undefined,
  title: row.title,
  createdAt: row.created_at.getTime(),
  updatedAt: row.updated_at.getTime(),
}));

// 4) Insert in chunks + record idempotency keys
await ctx.db.insert("migrationBatchLog", {
  table: "tasks",
  cursor,
  idempotencyKey,
});
for (const doc of transformed) {
  await ctx.db.insert("tasks", doc);
}

// 5) Update cursor
await ctx.db.patch(migrationStateId, { cursor: batch.nextCursor });
```

---

### Phase 2: Server Actions → Convex Functions

**Duration**: 7–10 days (largest phase — includes constraint enforcement for all 50+ functions)

#### 2.1 File Structure

```
convex/
├── schema.ts
├── auth.config.ts          # Auth provider config
├── helpers.ts              # Shared helpers (auth check, ownership, view guards)
│
├── tasks/
│   ├── queries.ts          # getTasks, getTask, searchTasks, getTasksForSearch
│   ├── mutations.ts        # createTask, updateTask, deleteTask, toggleCompletion
│   ├── subtasks.ts         # getSubtasks, createSubtask, updateSubtask, deleteSubtask
│   └── streak.ts           # updateStreak
│
├── lists/
│   ├── queries.ts          # getLists, getList
│   └── mutations.ts        # createList, updateList, deleteList, reorderLists
│
├── labels/
│   ├── queries.ts          # getLabels, getLabel
│   └── mutations.ts        # createLabel, updateLabel, deleteLabel, reorderLabels
│
├── gamification/
│   ├── queries.ts          # getUserStats, getAchievements, getUserAchievements
│   └── mutations.ts        # addXP, checkAchievements
│
├── time/
│   ├── queries.ts          # getTimeEntries, getActiveTimeEntry, getTimeStats
│   └── mutations.ts        # startTimeEntry, stopTimeEntry, createManualEntry, ...
│
├── views/
│   ├── queries.ts          # getViewSettings, getSavedViews
│   └── mutations.ts        # saveViewSettings, resetViewSettings, ...
│
├── templates/
│   ├── queries.ts
│   └── mutations.ts
│
├── reminders/
│   ├── queries.ts
│   └── mutations.ts
│
├── dependencies/
│   ├── queries.ts
│   └── mutations.ts
│
├── logs/
│   └── queries.ts          # getTaskLogs, getActivityLog, getCompletionHistory
│
├── search/
│   └── queries.ts          # searchAll (uses search indexes)
│
├── ai/
│   └── actions.ts          # parseVoiceCommand, rescheduleOverdueTasks, smartSchedule
│
├── user/
│   ├── queries.ts          # getCurrentUser
│   └── mutations.ts        # updateUserPreferences, syncUser
│
├── integrations/
│   ├── todoist.ts          # Todoist sync actions
│   └── googleTasks.ts      # Google Tasks sync actions
│
└── migrations/
    └── importFromPostgres.ts
```

#### 2.2 Function Translation Pattern

**Before (Server Action):**

```typescript
// src/lib/actions/lists.ts
"use server";
import { db, lists } from "@/db";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";

export async function createList(data: {
  name: string;
  color?: string;
  icon?: string;
}) {
  const user = await requireAuth();
  const slug = data.name.toLowerCase().replace(/\s+/g, "-");
  const [newList] = await db
    .insert(lists)
    .values({
      userId: user.id,
      name: data.name,
      color: data.color ?? "#000000",
      icon: data.icon,
      slug,
      position: 0,
    })
    .returning();
  revalidatePath("/");
  return newList;
}
```

**After (Convex Mutation):**

```typescript
// convex/lists/mutations.ts
import { mutation } from "../_generated/server";
import { v } from "convex/values";

export const createList = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
    icon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx); // central guard in helpers.ts

    const slug = args.name.toLowerCase().replace(/\s+/g, "-");

    return await ctx.db.insert("lists", {
      userId: user._id,
      name: args.name,
      color: args.color ?? "#000000",
      icon: args.icon,
      slug,
      description: undefined,
      position: 0,
      updatedAt: Date.now(),
    });
    // No revalidatePath needed — all useQuery subscribers auto-update!
  },
});
```

#### 2.3 Auth Helper

Create a reusable auth helper to avoid repetition:

```typescript
// convex/helpers.ts
import { QueryCtx, MutationCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

export async function getAuthUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
    .unique();

  if (!user) throw new Error("User not found");
  return user;
}

export async function requireOwnership(
  ctx: QueryCtx | MutationCtx,
  userId: any, // Doc["users"]["_id"]
  resourceUserId: any,
): void {
  if (userId !== resourceUserId) {
    throw new Error("Forbidden: resource does not belong to you");
  }
}
```

#### 2.3.1 Ownership Checks on Junction Tables

Because Convex has no joins, include `userId` on tables like `taskLabels`, `taskDependencies`, `reminders`, and `habitCompletions`, and validate `userId` in queries/mutations before returning data.

#### 2.3.2 Access Control Checklist (Required)

For each public query/mutation, verify:

- `users`: only return the authenticated user or use `internal` for admin tasks.
- `lists`: filter by `userId` and validate ownership on get/update/delete.
- `tasks`: always scope by `userId` and verify list ownership when `listId` is present.
- `labels`: filter by `userId` and validate ownership on get/update/delete.
- `taskLabels`: filter by `userId` and ensure `taskId` + `labelId` belong to the same user.
- `taskDependencies`: filter by `userId` and validate both task IDs belong to the same user.
- `reminders`: filter by `userId` and validate `taskId` ownership.
- `taskLogs`: remove if audit history is dropped.
- `habitCompletions`: filter by `userId` and validate `taskId` ownership.
- `templates`: filter by `userId` and validate ownership on get/update/delete.
- `userStats`: filter by `userId` and ensure single row per user.
- `userAchievements`: filter by `userId` and validate `achievementId` exists.
- `viewSettings`: move to client-only state if purely UI; keep `savedViews` scoped by `userId`.
- `savedViews`: keep in Convex; compute view filtering client-side.
- `timeEntries`: filter by `userId` and validate `taskId` ownership.
- `customIcons`: filter by `userId`.
- `externalIntegrations`/`externalSyncState`/`externalEntityMap`/`externalSyncConflicts`: use `internal` queries for token reads and always scope by `userId`.

#### 2.4 Cascading Deletes

> ⚠️ **This is one of the most error-prone parts of the migration.** Postgres has `ON DELETE CASCADE` on ~12 foreign keys. Every cascade path must be manually implemented and tested.

Convex doesn't have automatic cascading deletes. Implement manually in mutations.

**Complete cascade dependency map:**

```
User deletion cascades into:
├── lists → (each list cascades into tasks, see below)
├── labels → taskLabels (by label), taskLogs (by label, if retained)
├── tasks → (see task cascade below)
├── templates
├── userStats
├── userAchievements
├── viewSettings (if retained)
├── savedViews
├── timeEntries
├── customIcons
├── taskLogs (if retained)
├── externalIntegrations
├── externalSyncState
├── externalEntityMap
├── externalSyncConflicts
└── rateLimits (remove)

List deletion cascades into:
├── tasks → (each task cascades, see below)
└── taskLogs (by list, if retained)

Task deletion cascades into:
├── taskLabels (by task)
├── taskDependencies (by task — BOTH directions: as taskId AND as blockerId)
├── reminders (by task)
├── habitCompletions (by task)
├── timeEntries (by task)
├── taskLogs (by task, if retained)
├── subtasks (tasks where parentId = this task) → recursive cascade!
└── externalEntityMap entries referencing this task

Label deletion cascades into:
├── taskLabels (by label)
└── taskLogs (by label, if retained)
```

**⚠️ Transaction limit risk:** Deleting a list with 100+ tasks, each with labels/dependencies/time entries, can require touching 1000+ documents in a single mutation. This **will** hit Convex mutation time/document limits.

**Required pattern: batched cascade with `ctx.scheduler`:**

```typescript
// convex/helpers.ts — Shared cascade helper
async function deleteTaskCascade(ctx: MutationCtx, taskId: Id<"tasks">) {
  // Delete junction tables and child records
  const taskLabels = await ctx.db
    .query("taskLabels")
    .withIndex("by_task", (q) => q.eq("taskId", taskId))
    .collect();
  for (const tl of taskLabels) await ctx.db.delete(tl._id);

  const depsAsTask = await ctx.db
    .query("taskDependencies")
    .withIndex("by_task", (q) => q.eq("taskId", taskId))
    .collect();
  for (const d of depsAsTask) await ctx.db.delete(d._id);

  // ⚠️ IMPORTANT: Also delete where this task is the BLOCKER
  const depsAsBlocker = await ctx.db
    .query("taskDependencies")
    .withIndex("by_blocker", (q) => q.eq("blockerId", taskId))
    .collect();
  for (const d of depsAsBlocker) await ctx.db.delete(d._id);

  const reminders = await ctx.db
    .query("reminders")
    .withIndex("by_task", (q) => q.eq("taskId", taskId))
    .collect();
  for (const r of reminders) await ctx.db.delete(r._id);

  const habits = await ctx.db
    .query("habitCompletions")
    .withIndex("by_task_date", (q) => q.eq("taskId", taskId))
    .collect();
  for (const h of habits) await ctx.db.delete(h._id);

  const timeEntries = await ctx.db
    .query("timeEntries")
    .withIndex("by_task", (q) => q.eq("taskId", taskId))
    .collect();
  for (const te of timeEntries) await ctx.db.delete(te._id);

  // Recursive: delete subtasks
  const subtasks = await ctx.db
    .query("tasks")
    .withIndex("by_parent", (q) => q.eq("parentId", taskId))
    .collect();
  for (const sub of subtasks) {
    await deleteTaskCascade(ctx, sub._id); // Recursive
  }

  await ctx.db.delete(taskId);
}

// convex/lists/mutations.ts
export const deleteList = mutation({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== user._id) throw new Error("Not found");

    const tasksInList = await ctx.db
      .query("tasks")
      .withIndex("by_list", (q) =>
        q.eq("userId", user._id).eq("listId", args.listId),
      )
      .collect();

    // ⚠️ For large lists, consider batching:
    // If tasksInList.length > BATCH_THRESHOLD, soft-delete the list
    // and schedule background cleanup via ctx.scheduler.runAfter()
    if (tasksInList.length > 50) {
      // Mark list as deleted (soft delete), schedule cleanup
      await ctx.db.patch(args.listId, { _deleted: true });
      await ctx.scheduler.runAfter(
        0,
        internal.lists.cleanup.cleanupDeletedList,
        {
          listId: args.listId,
          userId: user._id,
        },
      );
      return;
    }

    for (const task of tasksInList) {
      await deleteTaskCascade(ctx, task._id);
    }

    await ctx.db.delete(args.listId);
  },
});
```

#### 2.5 Search Migration

Replace Drizzle SQL text search with Convex search indexes:

```typescript
// convex/search/queries.ts
import { query } from "../_generated/server";
import { v } from "convex/values";

export const searchTasks = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);

    const titleResults = await ctx.db
      .query("tasks")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.query).eq("userId", user._id),
      )
      .take(20);

    const descResults = await ctx.db
      .query("tasks")
      .withSearchIndex("search_description", (q) =>
        q.search("description", args.query).eq("userId", user._id),
      )
      .take(20);

    // Deduplicate and merge results
    const seen = new Set<string>();
    const merged = [];
    for (const task of [...titleResults, ...descResults]) {
      if (!seen.has(task._id)) {
        seen.add(task._id);
        merged.push(task);
      }
    }
    return merged;
  },
});
```

#### 2.6 Unit Testing Convex Functions (During Migration)

Write unit tests alongside each migrated module. Default to `bun test` + `convex-test` (validated in Spike 1b). If Spike 1b fails, switch these tests to Vitest.

```typescript
// convex/tests/tasks.test.ts
import { convexTest } from "convex-test";
import { expect, test } from "bun:test";
import schema from "../schema";
import { api } from "../_generated/api";

test("create task", async () => {
  const t = convexTest(schema);

  // Set up authenticated user
  const userId = await t.run(async (ctx) => {
    return await ctx.db.insert("users", {
      externalId: "test-user",
      email: "test@example.com",
      isInitialized: true,
      updatedAt: Date.now(),
    });
  });

  // Create a list
  const listId = await t.run(async (ctx) => {
    return await ctx.db.insert("lists", {
      userId,
      name: "Inbox",
      slug: "inbox",
      position: 0,
      updatedAt: Date.now(),
    });
  });

  // Test the mutation
  const asUser = t.withIdentity({ subject: "test-user" });
  const taskId = await asUser.mutation(api.tasks.mutations.createTask, {
    title: "Test task",
    listId,
  });

  // Verify
  const task = await t.run(async (ctx) => {
    return await ctx.db.get(taskId);
  });

  expect(task?.title).toBe("Test task");
  expect(task?.userId).toBe(userId);
});
```

---

### Phase 3: Authentication

**Duration**: 1–2 days

#### Option A: Keep WorkOS AuthKit (Recommended for minimal disruption)

> ⚠️ **This option requires Spike 1 to pass first.** The exact auth.config.ts values depend on the actual JWT claims from WorkOS.

Configure Convex to verify WorkOS JWTs. The `domain` and `applicationID` must match the `iss` and `aud` claims in the actual WorkOS JWT — decode a real token to verify these values.

```typescript
// convex/auth.config.ts
// ⚠️ These values MUST be verified against a real decoded WorkOS JWT.
// Decode at https://jwt.io and check the `iss` and `aud` fields.
export default {
  providers: [
    {
      domain: process.env.WORKOS_ISSUER_URL, // Must match JWT `iss` claim exactly
      applicationID: "your-workos-client-id", // Must match JWT `aud` claim exactly
    },
  ],
};
```

Use the official integration package (determined in Spike 1):

```typescript
// src/components/providers/ConvexClientProvider.tsx
"use client";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuthKit } from "@convex-dev/workos-authkit"; // Or custom bridge
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({ children }) {
  return (
    <ConvexProviderWithAuthKit client={convex}>
      {children}
    </ConvexProviderWithAuthKit>
  );
}
```

**Dev bypass and E2E test mode:** The current auth bypass system (dev user, IP allowlist, E2E test cookies) does NOT translate to Convex. Convex auth requires valid JWTs — headers and cookies are not forwarded to Convex functions. You must design a new bypass strategy (and implement it in Phase 3 before Phase 4):

- **Dev mode**: Use a test Convex deployment with a hardcoded test user (no auth required via `ConvexProvider` without auth).
- **E2E tests**: Mint real WorkOS test tokens, or use Convex's `t.withIdentity()` in unit tests and a test WorkOS tenant for E2E.
- **IP allowlist bypass**: Not possible with Convex (client IP is not available in Convex functions). Consider a Convex `internal` mutation for admin tasks instead.

#### Auth Test Mode Strategy (Required before Phase 4)

Applies to both Option A and Option B. Define a deterministic auth strategy early so Phase 4 and E2E can validate end-to-end flows.

Options:

- WorkOS test tenant with scripted login + token extraction
- Convex `internal` test-auth mutation gated by `E2E_TEST_MODE` that issues a temporary token
- Clerk/Convex test tokens (if you switch auth providers)

#### Option B: Switch to Convex Auth (Clerk)

If you want to simplify auth entirely, switch to Clerk (first-class Convex integration):

1. Replace `@workos-inc/authkit-nextjs` with `@clerk/nextjs`
2. Use `ConvexProviderWithClerk` wrapper
3. Migrate user accounts from WorkOS → Clerk

This is a bigger change but yields a cleaner integration.

#### User Sync on First Login

```typescript
// convex/user/mutations.ts
export const syncUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (existing) {
      // Update user info
      await ctx.db.patch(existing._id, {
        email: identity.email!,
        firstName: identity.givenName ?? undefined,
        lastName: identity.familyName ?? undefined,
        avatarUrl: identity.pictureUrl ?? undefined,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new user + initialize defaults
    const userId = await ctx.db.insert("users", {
      externalId: identity.subject,
      email: identity.email!,
      firstName: identity.givenName ?? undefined,
      lastName: identity.familyName ?? undefined,
      avatarUrl: identity.pictureUrl ?? undefined,
      isInitialized: false,
      updatedAt: Date.now(),
    });

    // Create default Inbox list
    await ctx.db.insert("lists", {
      userId,
      name: "Inbox",
      slug: "inbox",
      color: "#6366f1",
      icon: "inbox",
      position: 0,
      updatedAt: Date.now(),
    });

    // Create user stats
    await ctx.db.insert("userStats", {
      userId,
      xp: 0,
      level: 1,
      currentStreak: 0,
      longestStreak: 0,
      streakFreezes: 0,
    });

    // Mark initialized
    await ctx.db.patch(userId, { isInitialized: true });

    return userId;
  },
});
```

---

### Phase 4: Real-Time & Client Integration (Convex-Only)

**Duration**: 5–7 days

> ⚠️ **Architecture shift warning:** Almost ALL pages (~15) are currently Server Components that call server actions directly for data fetching. With Convex, `useQuery` cannot run in Server Components — only in Client Components.
>
> **Impact:**
>
> - Most page components must become Client Components (add `"use client"`) or be split into a Server Component shell + Client Component body.
> - All authenticated pages will be client-rendered with `useQuery` (no SSR preload) to simplify auth token handling.
> - Bundle size will increase as more code moves to the client.

#### 4.1 Replace React Query with Convex Hooks

**Before:**

```tsx
// Component using React Query + Server Actions
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getTasks, createTask } from "@/lib/actions";

function TaskList() {
  const { data: tasks } = useQuery({ queryKey: ["tasks"], queryFn: getTasks });
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: createTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });
  // ...
}
```

**After:**

```tsx
// Component using Convex hooks
"use client";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function TaskList() {
  const tasks = useQuery(api.tasks.queries.getTasks);
  const createTask = useMutation(api.tasks.mutations.createTask);

  const handleCreate = async (data) => {
    await createTask(data);
    // No invalidation needed — useQuery auto-updates!
  };
  // ...
}
```

**Pagination note:** Convex queries have execution and scan limits. For `tasks` and `timeEntries`, use cursor-based pagination (`paginate()` or `take` + `startAfter`) rather than unbounded `collect()` in production. Include `taskLogs` only if audit logs are retained.

**Access control note:** Centralize auth + ownership checks in `convex/helpers.ts` so queries/mutations call a single guard rather than duplicating checks.

#### 4.1.1 Pagination Map (Required)

Replace each unbounded list query with cursor-based pagination:

- `getTasks`, `getTasksByList`, `getCompletedTasks`: use `take` + `startAfter` on `by_listView` and `by_completedAt` indexes.
- `getTaskLogs`, `getActivityLog`, `getCompletionHistory`: page by `createdAt` or `_creationTime` with a `by_user` index.
- `getTimeEntries`, `getTimeStats`: page by `startedAt` using `by_startedAt`.
- `searchTasks`, `searchAll`: page results and surface “more results available” when hit the 1024‑result cap.

#### 4.2 Remove Zustand Stores

The following stores become unnecessary:

- `src/lib/store/task-store.ts` → replaced by `useQuery(api.tasks.queries.getTasks)`
- `src/lib/store/list-store.ts` → replaced by `useQuery(api.lists.queries.getLists)`
- `src/lib/store/label-store.ts` → replaced by `useQuery(api.labels.queries.getLabels)`

#### 4.3 Remove SyncProvider + IndexedDB (Online-Only)

Delete:

- `src/components/providers/sync-provider.tsx`
- `src/lib/sync/db.ts`
- `src/lib/sync/registry.ts`
- `src/lib/sync/types.ts`
- `src/components/sync/SyncStatus.tsx`
- `src/components/sync/ConflictDialog.tsx`

#### 4.4 Remove QueryProvider

Delete `src/components/providers/QueryProvider.tsx` and remove `@tanstack/react-query` dependency.

#### 4.5 Add Optimistic Updates (Optional Enhancement)

```typescript
const createTask = useMutation(
  api.tasks.mutations.createTask,
).withOptimisticUpdate((localStore, args) => {
  const currentTasks = localStore.getQuery(api.tasks.queries.getTasks, {});
  if (currentTasks) {
    localStore.setQuery(api.tasks.queries.getTasks, {}, [
      ...currentTasks,
      {
        _id: "optimistic_" + Date.now(), // temporary
        _creationTime: Date.now(),
        ...args,
      },
    ]);
  }
});
```

#### 4.6 Server Component Integration (Simplified)

Treat authenticated pages as client-only components that use `useQuery`. Skip `preloadQuery` to avoid server-side token handling.

---

### Phase 5: AI Features (Gemini Actions)

**Duration**: 1–2 days

AI features (calling external APIs) become Convex **actions**:

```typescript
// convex/ai/actions.ts
import { action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";

export const parseVoiceCommand = action({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    // Actions can access environment variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini API key not configured");

    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: "gemini-2.0-flash" });

    const result = await model.generateContent(`Parse: "${args.text}" ...`);
    return JSON.parse(result.response.text());
  },
});

export const rescheduleOverdueTasks = action({
  args: {},
  handler: async (ctx) => {
    // 1. Read overdue tasks via internal query
    const overdueTasks = await ctx.runQuery(
      internal.tasks.queries.getOverdueTasks,
    );

    // 2. Call Gemini API
    const suggestions = await callGemini(overdueTasks);

    // 3. Optionally apply suggestions via internal mutation
    // await ctx.runMutation(internal.tasks.mutations.batchReschedule, { suggestions });

    return suggestions;
  },
});
```

The `smart-scheduler.ts` and `smart-tags.ts` pure logic can be moved into `convex/lib/` as helper functions.

---

### Phase 6: Offline Sync Removal

**Duration**: 1–2 days

> ⚠️ **CRITICAL CORRECTION:** The original plan stated "Convex automatically queues mutations when offline and replays them when reconnected." **This is incorrect.**
>
> Convex uses WebSocket connections. When offline:
>
> - **Subscriptions stop** — `useQuery` returns stale data, no updates.
> - **Mutations fail** — they are NOT durably queued. The WebSocket is disconnected.
> - **Optimistic updates revert** — the UI snaps back when the mutation fails.
>
> This is a **product regression** from the current IndexedDB + SyncProvider system, which provides true offline-first durability.

**Online-only plan:**

- Remove all offline sync code.
- Add a connection status indicator (see below).
- Update PWA service worker to show "offline — read-only" state.
- Disable mutation UI elements when disconnected.
- **Users WILL notice** if they currently rely on offline task creation.

**Important:** Convex conflict handling is last-write-wins unless you implement custom merge logic in mutations. Identify any flows that currently surface conflicts in the UI and decide whether to keep a simplified conflict dialog.

**Remove:**

| File/Directory                               | Replacement                       |
| -------------------------------------------- | --------------------------------- |
| `src/lib/sync/db.ts`                         | Convex built-in                   |
| `src/lib/sync/registry.ts`                   | `api.*` auto-generated            |
| `src/lib/sync/types.ts`                      | Not needed                        |
| `src/lib/store/task-store.ts`                | `useQuery`                        |
| `src/lib/store/list-store.ts`                | `useQuery`                        |
| `src/lib/store/label-store.ts`               | `useQuery`                        |
| `src/components/providers/sync-provider.tsx` | Not needed                        |
| `src/components/providers/QueryProvider.tsx` | `ConvexProvider`                  |
| `src/components/sync/SyncStatus.tsx`         | Optional Convex connection status |
| `src/components/sync/ConflictDialog.tsx`     | Not needed (or simplified)        |
| `idb` dependency                             | Remove from package.json          |
| `zustand` dependency                         | Remove if no other uses           |
| `@tanstack/react-query` dependency           | Remove                            |

**Add (optional):** A simple connection status indicator:

```tsx
import { useConvex } from "convex/react";

function ConnectionStatus() {
  // Convex automatically handles reconnection
  return null; // Or show a minimal indicator
}
```

---

### Phase 7: External Integrations (Fully Convex)

**Duration**: 2–3 days

Todoist and Google Tasks sync become Convex **actions** (since they call external APIs) + **scheduled functions** for periodic sync. Remove any external cron or Vercel scheduled jobs.

```typescript
// convex/integrations/todoist.ts
import { action } from "../_generated/server";
import { internal } from "../_generated/api";

export const syncFromTodoist = action({
  handler: async (ctx) => {
    // 1. Get integration credentials via internal query
    const integration = await ctx.runQuery(
      internal.integrations.queries.getIntegration,
      { provider: "todoist" },
    );

    // 2. Call Todoist API
    const todoistData = await fetch("https://api.todoist.com/sync/v9/sync", {
      headers: { Authorization: `Bearer ${integration.accessToken}` },
    });

    // 3. Process and write to Convex via internal mutation
    await ctx.runMutation(internal.integrations.mutations.processTodoistSync, {
      data: await todoistData.json(),
    });
  },
});

// Scheduled sync (cron job)
// convex/crons.ts
import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "sync-todoist",
  { minutes: 15 },
  internal.integrations.todoist.syncFromTodoist,
);

export default crons;
```

#### Encryption Considerations

The current app uses AWS KMS for token encryption. In Convex:

- Store a symmetric key in Convex environment variables (encrypted at rest).
- Encrypt/decrypt integration tokens in Convex actions using a pure-JS library.
- Restrict token reads to `internal` queries/actions; avoid exposing integration tokens via public queries.

---

### Phase 8: Testing & Cleanup

**Duration**: 2–3 days

#### 8.1 Unit Testing Convex Functions

Unit tests should already exist from Phase 2. At this stage, focus on expanding coverage and fixing gaps rather than introducing a new test framework.

#### 8.2 Test Runner Confirmation

- Current: Bun test with in-memory SQLite
- New: Keep Bun test and use `convex-test` (validated in Spike 1b). If Spike 1b fails, switch Convex unit tests to Vitest and update scripts/CI.

#### 8.3 E2E Tests

Playwright E2E tests largely stay the same — they test the UI, not the backend implementation. Update:

- Remove test-auth API route (use Convex auth testing patterns instead)
- Update `e2e/fixtures.ts` for Convex-compatible auth setup
- Ensure E2E can mint/attach an ID token for Convex auth (WorkOS or Clerk) to avoid `ctx.auth.getUserIdentity()` returning null

#### 8.3.1 Auth Test Mode Strategy

Already defined in Phase 3. Confirm it still works after frontend migration.

#### 8.4 Files to Delete

```
# Database layer (replaced by Convex)
src/db/schema.ts
src/db/schema-sqlite.ts
src/db/index.ts
src/db/seed.ts
drizzle.config.ts
drizzle/                          # All migration files

# Server Actions (replaced by convex/)
src/lib/actions.ts
src/lib/actions/                  # Entire directory
src/lib/action-result.ts
src/lib/ai-actions.ts
src/lib/smart-scheduler.ts
src/lib/smart-tags.ts
src/lib/rate-limit.ts            # Remove; rely on Convex limits + mutation throttling if needed

# Auth (simplified)
src/lib/auth.ts                  # Replaced by convex/helpers.ts
src/lib/auth-bypass.ts           # Rethink for Convex
src/lib/auth-errors.ts

# Offline sync (not needed)
src/lib/sync/
src/lib/store/
src/components/providers/sync-provider.tsx
src/components/providers/QueryProvider.tsx
src/components/providers/data-loader.tsx
src/components/sync/

# Test infrastructure
src/test/setup.tsx               # Replace with convex-test setup
src/db/schema-sqlite.ts

# Config
drizzle.config.ts
```

#### 8.5 Dependencies to Remove

```json
{
  "remove": [
    "@neondatabase/serverless",
    "drizzle-orm",
    "drizzle-kit",
    "@tanstack/react-query",
    "zustand",
    "idb"
  ],
  "add": ["convex", "convex-test", "@convex-dev/workos-authkit", "concurrently"]
}
```

#### 8.6 Convex Backup Rehearsal

Before cutover, run an export from Convex and verify you can re-import into a staging deployment. This validates data safety and rollback readiness.

---

## 5. Schema Translation Reference

| Drizzle (PostgreSQL)                      | Convex                                  | Notes                        |
| ----------------------------------------- | --------------------------------------- | ---------------------------- |
| `serial("id").primaryKey()`               | `_id` (automatic)                       | Auto-generated `Id<"table">` |
| `text("col").notNull()`                   | `v.string()`                            | Required by default          |
| `text("col")` (nullable)                  | `v.optional(v.string())`                | Omit field = not present     |
| `integer("col")`                          | `v.number()`                            | JS number (float64)          |
| `boolean("col")`                          | `v.boolean()`                           |                              |
| `timestamp("col").defaultNow()`           | `_creationTime`                         | Automatic, milliseconds      |
| `timestamp("col")`                        | `v.number()`                            | Store as `Date.now()`        |
| `.default("value")`                       | Set in mutation code                    | No schema-level defaults     |
| `text("col", { enum: [...] })`            | `v.union(v.literal(...), ...)`          | Union of literals            |
| `.references(() => table.id)`             | `v.id("table")`                         | Type-safe, no enforcement    |
| `primaryKey({ columns: [a, b] })`         | Separate table + index                  | Convex has no composite PKs  |
| `index("name").on(col)`                   | `.index("name", ["col"])`               | Chained on table definition  |
| `uniqueIndex(...)`                        | Check uniqueness in mutation            | No unique constraints        |
| `.onDelete("cascade")`                    | Implement in mutation                   | Manual cascade               |
| `.$onUpdate(() => new Date())`            | Set `updatedAt: Date.now()` in mutation | Manual                       |
| `foreignKey({ columns, foreignColumns })` | Document relationship via `v.id()`      | No composite FKs             |

---

## 6. Function Migration Map

### Queries (read-only, real-time subscriptions)

| Server Action             | Convex Query                                   | File                             |
| ------------------------- | ---------------------------------------------- | -------------------------------- |
| `getTasks()`              | `api.tasks.queries.getTasks`                   | `convex/tasks/queries.ts`        |
| `getTask(id)`             | `api.tasks.queries.getTask`                    | `convex/tasks/queries.ts`        |
| `searchTasks(q)`          | `api.search.queries.searchTasks`               | `convex/search/queries.ts`       |
| `getTasksForSearch()`     | `api.tasks.queries.getTasksForSearch`          | `convex/tasks/queries.ts`        |
| `getSubtasks(parentId)`   | `api.tasks.subtasks.getSubtasks`               | `convex/tasks/subtasks.ts`       |
| `getLists()`              | `api.lists.queries.getLists`                   | `convex/lists/queries.ts`        |
| `getList(id)`             | `api.lists.queries.getList`                    | `convex/lists/queries.ts`        |
| `getLabels()`             | `api.labels.queries.getLabels`                 | `convex/labels/queries.ts`       |
| `getLabel(id)`            | `api.labels.queries.getLabel`                  | `convex/labels/queries.ts`       |
| `getUserStats()`          | `api.gamification.queries.getUserStats`        | `convex/gamification/queries.ts` |
| `getAchievements()`       | `api.gamification.queries.getAchievements`     | `convex/gamification/queries.ts` |
| `getUserAchievements()`   | `api.gamification.queries.getUserAchievements` | `convex/gamification/queries.ts` |
| `getReminders(taskId)`    | `api.reminders.queries.getReminders`           | `convex/reminders/queries.ts`    |
| `getBlockers(taskId)`     | `api.dependencies.queries.getBlockers`         | `convex/dependencies/queries.ts` |
| `getBlockedTasks(taskId)` | `api.dependencies.queries.getBlockedTasks`     | `convex/dependencies/queries.ts` |
| `getViewSettings(viewId)` | `api.views.queries.getViewSettings` (optional) | `convex/views/queries.ts`        |
| `getTemplates()`          | `api.templates.queries.getTemplates`           | `convex/templates/queries.ts`    |
| `getTaskLogs()`           | `api.logs.queries.getTaskLogs` (optional)      | `convex/logs/queries.ts`         |
| `getActivityLog()`        | `api.logs.queries.getActivityLog` (optional)   | `convex/logs/queries.ts`         |
| `getCompletionHistory()`  | `api.logs.queries.getCompletionHistory` (optional) | `convex/logs/queries.ts`     |
| `getTimeEntries()`        | `api.time.queries.getTimeEntries`              | `convex/time/queries.ts`         |
| `getActiveTimeEntry()`    | `api.time.queries.getActiveTimeEntry`          | `convex/time/queries.ts`         |
| `getTimeStats()`          | `api.time.queries.getTimeStats`                | `convex/time/queries.ts`         |
| `searchAll(q)`            | `api.search.queries.searchAll`                 | `convex/search/queries.ts`       |

### Mutations (transactional writes)

| Server Action                | Convex Mutation                                | File                               |
| ---------------------------- | ---------------------------------------------- | ---------------------------------- |
| `createTask(data)`           | `api.tasks.mutations.createTask`               | `convex/tasks/mutations.ts`        |
| `updateTask(id, data)`       | `api.tasks.mutations.updateTask`               | `convex/tasks/mutations.ts`        |
| `deleteTask(id)`             | `api.tasks.mutations.deleteTask`               | `convex/tasks/mutations.ts`        |
| `toggleTaskCompletion(id)`   | `api.tasks.mutations.toggleCompletion`         | `convex/tasks/mutations.ts`        |
| `createSubtask(...)`         | `api.tasks.subtasks.createSubtask`             | `convex/tasks/subtasks.ts`         |
| `updateSubtask(...)`         | `api.tasks.subtasks.updateSubtask`             | `convex/tasks/subtasks.ts`         |
| `deleteSubtask(id)`          | `api.tasks.subtasks.deleteSubtask`             | `convex/tasks/subtasks.ts`         |
| `updateStreak()`             | `api.tasks.streak.updateStreak`                | `convex/tasks/streak.ts`           |
| `createList(data)`           | `api.lists.mutations.createList`               | `convex/lists/mutations.ts`        |
| `updateList(id, data)`       | `api.lists.mutations.updateList`               | `convex/lists/mutations.ts`        |
| `deleteList(id)`             | `api.lists.mutations.deleteList`               | `convex/lists/mutations.ts`        |
| `reorderLists(ids)`          | `api.lists.mutations.reorderLists`             | `convex/lists/mutations.ts`        |
| `createLabel(data)`          | `api.labels.mutations.createLabel`             | `convex/labels/mutations.ts`       |
| `updateLabel(id, data)`      | `api.labels.mutations.updateLabel`             | `convex/labels/mutations.ts`       |
| `deleteLabel(id)`            | `api.labels.mutations.deleteLabel`             | `convex/labels/mutations.ts`       |
| `reorderLabels(ids)`         | `api.labels.mutations.reorderLabels`           | `convex/labels/mutations.ts`       |
| `addXP(amount)`              | `api.gamification.mutations.addXP`             | `convex/gamification/mutations.ts` |
| `checkAchievements()`        | `api.gamification.mutations.checkAchievements` | `convex/gamification/mutations.ts` |
| `saveViewSettings(...)`      | `api.views.mutations.saveViewSettings` (optional) | `convex/views/mutations.ts`    |
| `resetViewSettings(...)`     | `api.views.mutations.resetViewSettings` (optional) | `convex/views/mutations.ts`   |
| `createReminder(...)`        | `api.reminders.mutations.createReminder`       | `convex/reminders/mutations.ts`    |
| `deleteReminder(id)`         | `api.reminders.mutations.deleteReminder`       | `convex/reminders/mutations.ts`    |
| `addDependency(...)`         | `api.dependencies.mutations.addDependency`     | `convex/dependencies/mutations.ts` |
| `removeDependency(...)`      | `api.dependencies.mutations.removeDependency`  | `convex/dependencies/mutations.ts` |
| `createTemplate(...)`        | `api.templates.mutations.createTemplate`       | `convex/templates/mutations.ts`    |
| `updateTemplate(...)`        | `api.templates.mutations.updateTemplate`       | `convex/templates/mutations.ts`    |
| `deleteTemplate(id)`         | `api.templates.mutations.deleteTemplate`       | `convex/templates/mutations.ts`    |
| `instantiateTemplate(id)`    | `api.templates.mutations.instantiateTemplate`  | `convex/templates/mutations.ts`    |
| `startTimeEntry(...)`        | `api.time.mutations.startTimeEntry`            | `convex/time/mutations.ts`         |
| `stopTimeEntry(id)`          | `api.time.mutations.stopTimeEntry`             | `convex/time/mutations.ts`         |
| `createManualTimeEntry(...)` | `api.time.mutations.createManualEntry`         | `convex/time/mutations.ts`         |
| `updateTimeEntry(...)`       | `api.time.mutations.updateTimeEntry`           | `convex/time/mutations.ts`         |
| `deleteTimeEntry(id)`        | `api.time.mutations.deleteTimeEntry`           | `convex/time/mutations.ts`         |
| `updateTaskEstimate(...)`    | `api.time.mutations.updateTaskEstimate`        | `convex/time/mutations.ts`         |
| `updateUserPreferences(...)` | `api.user.mutations.updatePreferences`         | `convex/user/mutations.ts`         |

### Actions (external API calls / side effects)

| Server Action                | Convex Action                           | File                                 |
| ---------------------------- | --------------------------------------- | ------------------------------------ |
| `parseVoiceCommand(text)`    | `api.ai.actions.parseVoiceCommand`      | `convex/ai/actions.ts`               |
| `rescheduleOverdueTasks()`   | `api.ai.actions.rescheduleOverdueTasks` | `convex/ai/actions.ts`               |
| `extractDeadline(text)`      | `api.ai.actions.extractDeadline`        | `convex/ai/actions.ts`               |
| `suggestSubtasks(task)`      | `api.ai.actions.suggestSubtasks`        | `convex/ai/actions.ts`               |
| `scheduleUnscheduledTasks()` | `api.ai.actions.scheduleUnscheduled`    | `convex/ai/actions.ts`               |
| `suggestMetadata(title)`     | `api.ai.actions.suggestMetadata`        | `convex/ai/actions.ts`               |
| Todoist sync                 | `api.integrations.todoist.sync`         | `convex/integrations/todoist.ts`     |
| Google Tasks sync            | `api.integrations.googleTasks.sync`     | `convex/integrations/googleTasks.ts` |

### Missing from Original Map (Added)

| Server Action / Module                  | Convex Equivalent                                        | File                                      |
| --------------------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| `custom-icons.ts` (CRUD)                | `api.customIcons.mutations.*`                            | `convex/customIcons/mutations.ts`         |
| `data-migration.ts`                     | One-time migration action (Phase 1)                      | `convex/migrations/importFromPostgres.ts` |
| `shared.ts` (shared helpers)            | `convex/helpers.ts`                                      | Already planned                           |
| `actions/index.ts` (re-exports)         | Not needed — Convex `api` object replaces all re-exports | N/A                                       |
| `task-safe.ts` (Zod-validated wrappers) | Convex validators replace Zod (`v.string()`, etc.)       | Inline in mutation `args`                 |
| `todoist.ts` (OAuth + sync)             | `api.integrations.todoist.*`                             | `convex/integrations/todoist.ts`          |
| `google-tasks.ts` (OAuth + sync)        | `api.integrations.googleTasks.*`                         | `convex/integrations/googleTasks.ts`      |

---

## 7. What Gets Removed

### Dependencies Removed (~7)

| Package                      | Replacement                          |
| ---------------------------- | ------------------------------------ |
| `@neondatabase/serverless`   | Convex DB                            |
| `drizzle-orm`                | Convex `ctx.db`                      |
| `drizzle-kit` (dev)          | Convex schema auto-sync              |
| `@tanstack/react-query`      | Convex `useQuery`                    |
| `zustand`                    | Convex `useQuery` (if no other uses) |
| `idb`                        | Not needed                           |
| `@workos-inc/authkit-nextjs` | Optional: keep or replace with Clerk |

### Files/Directories Removed (~30+ files)

- `src/db/` (entire directory)
- `src/lib/actions/` (entire directory)
- `src/lib/actions.ts`
- `src/lib/sync/` (entire directory)
- `src/lib/store/` (entire directory)
- `src/lib/auth.ts` + `src/lib/auth-bypass.ts` + `src/lib/auth-errors.ts`
- `src/lib/action-result.ts`
- `src/lib/rate-limit.ts`
- `src/components/providers/sync-provider.tsx`
- `src/components/providers/QueryProvider.tsx`
- `src/components/providers/data-loader.tsx`
- `src/components/sync/`
- `src/test/setup.tsx`
- `drizzle/` (migration files)
- `drizzle.config.ts`

### Concepts Removed

| Concept                  | Why                                    |
| ------------------------ | -------------------------------------- |
| `revalidatePath("/")`    | Remove; Convex subscriptions auto-update |
| `"use server"` directive | Convex functions run on Convex backend |
| SQLite test schema       | Convex has its own test utilities      |
| IndexedDB offline queue  | Remove (online-only after migration)   |
| Zustand client cache     | Convex reactive cache replaces it      |
| React Query caching      | Convex's own reactive system           |
| Manual WebSocket/polling | Convex WebSocket is automatic          |
| Drizzle migration files  | Convex schema is pushed, not migrated  |

---

## 8. Risk Assessment

| Risk                                           | Severity     | Mitigation                                                                                                                                                                                               |
| ---------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **WorkOS AuthKit ↔ Convex JWT bridge**         | 🔴 Critical  | Spike 1 MUST pass before any function migration. WorkOS uses session cookies, Convex needs JWTs. If bridging fails, must switch to Clerk (adds weeks).                                                   |
| **Data loss during migration**                 | 🔴 High      | Run PostgreSQL and Convex in parallel during transition. Verify row counts match.                                                                                                                        |
| **ID format change** (text/serial → Convex ID) | 🔴 High      | Build comprehensive ID mapping. Audit EVERY access check. User ID change from WorkOS string PK to Convex `_id` affects every table and every auth comparison. One missed check = cross-tenant data leak. |
| **Offline/PWA functionality loss**             | 🔴 High      | Convex does NOT provide durable offline mutation queuing. Decision: accept regression and remove offline queue (Spike 4).                                                                                |
| **Cascading delete completeness**              | 🟠 High      | ~12 cascade paths must be manually implemented. Must handle transaction limits for large datasets (soft-delete + scheduled cleanup). Missing one cascade = orphaned data.                                |
| **No unique constraints**                      | 🟠 High      | Enforce uniqueness in mutations (check-then-insert within a mutation transaction). Still possible to get duplicates from bugs. Add background repair jobs.                                               |
| **Server Component → Client Component shift**  | 🟠 High      | ~15 pages change rendering model. Bundle size increases. Authenticated pages are client-only to simplify auth token handling.                                                                           |
| **Encryption key management**                 | 🟠 Medium    | Use Convex environment variables for a symmetric key. If compliance requires KMS, proxy encryption through a Convex action to a separate service or reintroduce KMS.                                     |
| **Search quality regression**                  | 🟠 Medium    | Convex search ≠ Fuse.js fuzzy matching. Decision: accept regression and remove Fuse.js.                                                                                                                |
| **Auth token mismatch (`iss`/`aud`)**          | 🟠 Medium    | Verify WorkOS `iss`/`aud` against actual JWT claims. Common cause of `isAuthenticated === false`.                                                                                                        |
| **Auth bypass / E2E test mode**                | 🟠 Medium    | Current dev bypass, IP allowlist, and E2E test cookies don't translate to Convex. Must design new bypass strategy.                                                                                       |
| **Performance regression**                     | 🟡 Medium    | Convex indexes must cover all current query patterns. Benchmark critical paths. Use pagination for large datasets.                                                                                       |
| **Convex query/mutation limits**               | 🟡 Medium    | Large cascading deletes and unbounded `.collect()` queries may hit limits. Paginate and batch.                                                                                                           |
| **Feature flag dual-write complexity**         | 🟡 Medium    | Different ID systems (serial vs Convex ID) make rollback non-trivial. Dual-write requires reconciliation strategy.                                                                                       |
| **Data divergence during dual-write**          | 🟡 Medium    | Define a single source of truth, or implement ordered dual-write + reconciliation strategy.                                                                                                              |
| **Missing action modules in migration map**    | 🟡 Low       | `data-migration.ts`, `custom-icons.ts`, `shared.ts`, `index.ts` not explicitly in function map. Verify complete inventory.                                                                               |
| **External integration downtime**              | 🟡 Low       | Migrate integrations last. Can run on old Server Actions temporarily.                                                                                                                                    |
| **E2E test breakage**                          | 🟡 Low       | UI tests are implementation-agnostic. Update auth fixtures only.                                                                                                                                         |
| **Convex vendor lock-in**                      | 📌 Strategic | Convex schema is TypeScript — data can be exported. Evaluate against open-source alternatives.                                                                                                           |

---

## 9. Rollback Strategy

### During Migration (Dual-Write Period)

1. Keep Neon PostgreSQL running throughout migration
2. Feature-flag new Convex code: `NEXT_PUBLIC_USE_CONVEX=true`
3. Components check the flag and use either Server Actions or Convex hooks
4. Decide whether you are dual-writing or single-writing to Convex. If dual-writing, define ordering and reconciliation strategy.
5. If issues arise, flip the flag to roll back instantly

### After Migration

1. Keep Neon database as read-only backup for 30 days
2. Export all Convex data via migration action as JSON backup
3. Document the reverse migration path (Convex → PostgreSQL) if ever needed

### Feature Flag Implementation

> ⚠️ **Dual-backend complexity warning:** Running two backends simultaneously with DIFFERENT ID systems (Postgres serial/text IDs vs Convex document IDs) makes true rollback non-trivial. Consider:
>
> - Feature-flagging at the **deployment level** (Vercel preview = Convex, production = Postgres) rather than runtime toggles.
> - Using a **short cutover window** (write-freeze → migrate → verify → go-live) instead of long dual-write periods.
> - If dual-write is required, you need an ID reconciliation layer that maps between both systems.

```tsx
// src/lib/feature-flags.ts
export const USE_CONVEX = process.env.NEXT_PUBLIC_USE_CONVEX === "true";

// In components:
import { USE_CONVEX } from "@/lib/feature-flags";

function TaskList() {
  if (USE_CONVEX) {
    return <ConvexTaskList />;
  }
  return <LegacyTaskList />;
}
```

---

## Appendix: Migration Checklist

### Pre-Implementation Spikes (BLOCKING — must pass before feature work)

- [ ] **Spike 1**: Auth PoC — `@convex-dev/workos-authkit` or custom bridge working, `ctx.auth.getUserIdentity()` returns non-null in dev + staging
- [ ] **Spike 2**: Constraint parity matrix — every PK/FK/unique/cascade documented with Convex enforcement strategy
- [ ] **Spike 3**: Cascade delete prototype — `deleteList` with 200+ tasks works within Convex limits, batching pattern designed
- [ ] **Spike 4**: Offline/PWA decision documented — accept online-only regression with stakeholder sign-off
- [ ] **Spike 5**: Encryption approach confirmed — use Convex env vars + pure-JS encryption library

### Phase Checklist

- [ ] **Phase 0**: `convex init`, ConvexProvider, env vars
- [ ] **Phase 0**: Verify WorkOS JWT flow (`iss`/`aud`) and `ctx.auth.getUserIdentity()`
- [ ] **Phase 0**: Design auth bypass strategy for dev mode and E2E tests (current bypass system won't work)
- [ ] **Phase 0**: Remove or avoid all Next.js API routes for backend logic (Convex-only backend surface)
- [ ] **Phase 1**: Schema in `convex/schema.ts` with all constraint warnings addressed
  - [ ] `externalEntityMap` index includes `entityType`
  - [ ] Achievement ID mapping strategy documented
  - [ ] User ID strategy (WorkOS string → Convex `_id`) fully mapped
  - [ ] All uniqueness constraints have mutation-level enforcement
- [ ] **Phase 1**: Chunked + resumable data migration with id-map persistence
- [ ] **Phase 2**: All 50+ Server Actions → Convex functions
  - [ ] Tasks (CRUD, subtasks, search, reorder)
  - [ ] Lists (CRUD, reorder)
  - [ ] Labels (CRUD, reorder)
  - [ ] Gamification (stats, XP, achievements)
  - [ ] Time tracking (entries, stats)
  - [ ] Views (saved views only; view settings moved client-only)
  - [ ] Templates (CRUD, instantiate)
  - [ ] Reminders (CRUD)
  - [ ] Dependencies (add, remove, query)
  - [ ] Logs (optional; drop if audit logs are not required)
- [ ] Search (full-text via Convex searchIndex only; Fuse.js removed)
  - [ ] User (preferences, sync)
  - [ ] **Custom icons** (CRUD — was missing from original map)
  - [ ] **Data migration utilities** (was missing from original map)
  - [ ] **Shared helpers** (was missing from original map)
  - [ ] All cascade delete paths implemented and tested
  - [ ] All junction table mutations have dedupe checks
  - [ ] All mutations validate cross-user ownership (composite FK replacement)
- [ ] **Phase 3**: Authentication (WorkOS JWT or Clerk migration)
- [ ] **Phase 4**: Client components → Convex hooks
  - [ ] Convert ~15 Server Component pages to Client Components
  - [ ] Remove React Query
  - [ ] Remove Zustand stores
  - [ ] Remove SyncProvider + IndexedDB (online-only)
  - [ ] Add optimistic updates where needed
  - [ ] Client-only rendering for authenticated pages (no SSR preload)
- [ ] **Phase 5**: AI actions → Convex actions
  - [ ] Verify `@google/generative-ai` works in Convex action runtime
  - [ ] Implement Convex-side encryption for integration tokens per Spike 5
- [ ] **Phase 6**: Offline sync removal (online-only)
  - [ ] PWA service worker updated for new architecture
- [ ] **Phase 7**: External integrations → Convex actions + crons (no external schedulers)
  - [ ] **Phase 8**: Testing + cleanup
  - [ ] Confirm test runner decision from Spike 1b (Bun + `convex-test` or Vitest)
  - [ ] E2E tests passing with new auth strategy
  - [ ] E2E auth strategy selected + implemented
  - [ ] Remove unused dependencies
  - [ ] Delete old files
  - [ ] Update AGENTS.md and README.md
- [ ] **Final**: Remove feature flag, decommission Neon database

---

## Appendix: Bulletproofing Validation Plan

This section lists concrete pre-flight checks that must pass before implementation and cutover.

### A. Auth Proofs (Required)

1. Capture a real WorkOS ID token from the browser.
2. Decode it at https://jwt.io and verify:
   - `iss` equals the `domain` in `convex/auth.config.ts`
   - `aud` equals `applicationID`
3. Run a Convex dev mutation that logs `ctx.auth.getUserIdentity()` and confirm it is non-null.
4. Client-only proof: authenticated pages load via `useQuery` without server-side token handling.

**Acceptance thresholds:**

- Auth proof must succeed in both local dev and a staging deployment.
- `ctx.auth.getUserIdentity()` must return a stable `subject` matching the WorkOS user ID across refreshes.

### B. Migration Dry Run (Required)

1. Run migration against a **copy** of Postgres and a Convex dev deployment.
2. For each table, compare counts and sample 100 random records to verify field-level correctness.
3. Verify ID maps are complete by checking any foreign key in Convex resolves to a valid target doc.
4. Simulate a failure mid-batch and verify the migration can resume without duplicate inserts.

**Acceptance thresholds:**

- Counts match exactly for every table.
- Random sample (>=100 rows) passes field-level comparison with no mismatches.
- No orphaned foreign keys in Convex (0 unresolved references).

### C. Data Integrity Checks (Required)

- All tasks have a valid `userId` and (if present) `listId`.
- All junction tables (`taskLabels`, `taskDependencies`) reference valid task/label IDs and share `userId`.
- All external integration rows are readable only by `internal` functions.

**Acceptance thresholds:**

- Integrity checks must pass on both dev and staging datasets.
- Any failed check blocks cutover until resolved.

### D. Performance Smoke Tests (Required)

- Run `getTasks` with pagination in a dataset >10k tasks and confirm no timeout.
- Run `searchTasks` on a large dataset and verify truncation messaging when capped.

**Acceptance thresholds:**

- `getTasks` P95 response time < 400ms for 10k tasks dataset on staging.
- Search results return within 1 second with clear pagination/truncation UI.

### E. E2E Auth Harness (Required)

Choose one strategy and fully automate it:

- WorkOS test tenant login + token extraction
- Convex `internal` test auth mutation gated by `E2E_TEST_MODE`
- Clerk test token flow (if migrating auth)

**Acceptance thresholds:**

- E2E suite passes in CI with no manual token setup.
- Auth setup is deterministic and repeatable across environments.

### F. Cutover Checklist (Required)

1. Freeze writes on Postgres.
2. Run delta import.
3. Run integrity + sample checks.
4. Flip feature flag to Convex.
5. Monitor errors/latency and rollback if required.

**Acceptance thresholds:**

- 24 hours of error-free operation before decommissioning Postgres.
- Rollback verified by re-enabling Postgres feature flag within 5 minutes.

---

## Appendix: Validation Execution Checklist

This is an execution-ready checklist for running the bulletproofing plan.

### 1. Auth Validation

1. Capture ID token and verify `iss`/`aud`.
2. Run `debugAuth` mutation in dev/staging (must log non-null identity).
3. Authenticated pages load via client-only `useQuery` without SSR preload.

### 2. Migration Validation

1. Run migration on snapshot database.
2. Trigger Convex internal validation actions (counts, sample diff, FK audit, resume test).

### 3. Performance Validation

1. Seed 10k tasks per user in staging.
2. Measure P50/P95 latency for `getTasks` and `getTaskLogs`.
3. Validate pagination UX for large lists.

### 4. E2E Auth Validation

1. Run full Playwright suite in CI with the chosen auth strategy.
2. Confirm tests pass with a fresh environment (no cached tokens).

### 5. Cutover Validation

1. Freeze writes.
2. Run delta import.
3. Run integrity + sample checks.
4. Flip feature flag.
5. Monitor logs and rollback if necessary.

---

## Appendix: Validation Script Stubs

These are minimal starter scripts to automate validation steps.

### 1. Token Decode Helper

```bash
# Decode a JWT (header + payload) without verification
node -e "const t=process.argv[1].split('.'); console.log(Buffer.from(t[0], 'base64url').toString()); console.log(Buffer.from(t[1], 'base64url').toString());" "<JWT>"
```

### 2. Migration Validation Actions (Convex)

```ts
// convex/migrations/validation.ts
// Pseudo: implement as Convex internal actions + scheduled jobs
// - compareCounts
// - sampleDiff
// - fkAudit
// - migrationResumeTest
```

### 3. Migration Validation Scripts (Optional)

If you still need external scripts, keep minimal one-off helpers under `scripts/` to call the Convex validation actions.

---

## Appendix: Validation Task List

This converts the validation plan into concrete tasks with owners, estimates, and pass/fail criteria.

### Auth Validation Tasks

1. **Capture + decode ID token**
   - Owner: Backend
   - Estimate: 2 hours
   - Pass: `iss`/`aud` match Convex config and token is an OIDC ID token
2. **Convex auth mutation proof**
   - Owner: Backend
   - Estimate: 1 hour
   - Pass: `ctx.auth.getUserIdentity()` returns a stable subject across refreshes
3. **Client-only auth proof**
   - Owner: Fullstack
   - Estimate: 2 hours
   - Pass: Authenticated pages load via `useQuery` in staging without SSR preload

### Migration Validation Tasks

1. **Snapshot DB + run migration**
   - Owner: Backend
   - Estimate: 1 day
   - Pass: Migration completes without timeouts
2. **Counts + sample diff**
   - Owner: Backend
   - Estimate: 1 day
   - Pass: Counts equal and sample diff has 0 mismatches
3. **FK audit**
   - Owner: Backend
   - Estimate: 4 hours
   - Pass: 0 orphaned references
4. **Resume test**
   - Owner: Backend
   - Estimate: 4 hours
   - Pass: No duplicate inserts after resume

### Performance Validation Tasks

1. **Seed 10k tasks dataset**
   - Owner: Backend
   - Estimate: 2 hours
   - Pass: Data seeded in staging
2. **Latency measurements**
   - Owner: Fullstack
   - Estimate: 1 day
   - Pass: P95 < 400ms for `getTasks` and < 1s for search

### E2E Auth Validation Tasks

1. **Select auth strategy**
   - Owner: Tech lead
   - Estimate: 2 hours
   - Pass: Decision documented
2. **Implement strategy + CI pass**
   - Owner: Fullstack
   - Estimate: 1 day
   - Pass: Playwright suite passes in CI without manual steps

### Cutover Validation Tasks

1. **Write freeze + delta import**
   - Owner: Backend
   - Estimate: 4 hours
   - Pass: Delta import completes with 0 errors
2. **Final integrity check**
   - Owner: Backend
   - Estimate: 2 hours
   - Pass: All integrity checks pass
3. **Flip feature flag**
   - Owner: Fullstack
   - Estimate: 30 minutes
   - Pass: Production traffic uses Convex without errors

---

## Appendix: Deep Convex Integration — Additional Simplifications

> Beyond the core migration, these are systems that can be **eliminated or dramatically simplified** by leaning fully into the Convex platform. Each item reduces custom code, removes dependencies, or replaces bespoke infrastructure with built-in Convex primitives.

### 1. Remove All Zod Validation Schemas (`src/lib/validation/`)

**Current state:** Three Zod schema files (`tasks.ts`, `reminders.ts`, `time-tracking.ts`) plus `task-safe.ts` wrappers that validate Server Action inputs at runtime.

**Convex replacement:** Convex mutation `args` validators (`v.string()`, `v.number()`, `v.optional(...)`, `v.union(v.literal(...), ...)`) provide the same runtime validation, are type-safe end-to-end, and auto-generate TypeScript types for the client. No separate validation layer needed.

**Remove:**
- `src/lib/validation/tasks.ts`
- `src/lib/validation/reminders.ts`
- `src/lib/validation/time-tracking.ts`
- `src/lib/actions/task-safe.ts`
- `zod` dependency (if no other uses remain)

### 2. Remove `ActionResult` / `withErrorHandling` Error Infrastructure

**Current state:** A 300-line `action-result.ts` module with `ActionResult<T>` discriminated union, 7 custom error classes (`ValidationError`, `NotFoundError`, `ConflictError`, etc.), `withErrorHandling` wrapper, `sanitizeError`, and pattern matching for sensitive data. Every Server Action is wrapped.

**Convex replacement:** Convex mutations/queries throw `ConvexError` for user-facing errors. The Convex client automatically serializes errors across the wire. Use `ConvexError` with structured data:

```typescript
import { ConvexError } from "convex/values";
throw new ConvexError({ code: "NOT_FOUND", message: "Task not found" });
```

On the client, catch with `try/catch` or Convex's error callback. No custom wrapper, no error sanitization layer, no `ActionResult` type.

**Remove:**
- `src/lib/action-result.ts` (+ test)
- `src/lib/auth-errors.ts`
- All `withErrorHandling` wrappers in action files
- All `ActionResult<T>` return types
- Custom error classes (`ValidationError`, `DatabaseError`, `NetworkError`, `ConflictError`, etc.)
- `src/lib/actions/shared.ts` (barrel re-export file — Convex functions import directly)

### 3. Remove Rate Limiting Table & Module — Use Convex Component

**Current state:** A custom `rateLimits` database table with an atomic upsert-based rate limiter in `rate-limit.ts`, including SQLite/Postgres branching logic. Used in time-tracking actions.

**Convex replacement:** Use the [`@convex-dev/ratelimiter`](https://www.convex.dev/components/rate-limiter) Convex component, which provides token-bucket and fixed-window rate limiting as a drop-in:

```typescript
import { RateLimiter } from "@convex-dev/ratelimiter";
const rateLimiter = new RateLimiter(components.rateLimiter, {
  timeTracking: { kind: "fixed window", rate: 20, period: 60_000 },
});
// In mutation:
await rateLimiter.limit(ctx, "timeTracking", { key: userId });
```

**Remove:**
- `src/lib/rate-limit.ts` (+ test)
- `rateLimits` table from schema
- SQLite/Postgres branching logic in rate limiter

### 4. Remove `env.ts` Environment Validation

**Current state:** `src/lib/env.ts` validates `DATABASE_URL`, WorkOS keys, `GEMINI_API_KEY`, and Todoist encryption key formats at startup.

**Convex replacement:** Convex environment variables are managed via the Convex dashboard or CLI (`npx convex env set`). `DATABASE_URL` is eliminated entirely (Convex IS the database). API keys are accessed via `process.env` in Convex actions. The only client-side env var is `NEXT_PUBLIC_CONVEX_URL`, auto-set by `npx convex dev`.

**Remove:**
- `src/lib/env.ts`
- `DATABASE_URL` from all env config
- Todoist KMS-related env validation (replaced by Convex env vars + pure-JS encryption)

### 5. Remove `UserProvider` — Use Convex Query for Preferences

**Current state:** `UserProvider.tsx` is a React context that receives user preferences (24h clock, week start day, calendar tooltip settings) from Server Components and passes them via context.

**Convex replacement:** Store user preferences in the Convex `users` table. Consume directly via `useQuery(api.user.queries.getPreferences)` wherever needed. Convex's reactive system means preference changes propagate instantly to all components without context plumbing.

**Remove:**
- `src/components/providers/UserProvider.tsx`
- All `<UserProvider>` wrappers in layouts
- `useUser()` hook (replace with `useQuery(api.user.queries.getPreferences)`)

### 6. Remove Next.js Middleware for Auth

**Current state:** 110-line `middleware.ts` with WorkOS `authkitMiddleware`, dev bypass logic, E2E test mode handling, IP allowlist checking, and HMAC signature verification.

**Convex replacement:** Auth is handled entirely by Convex JWT verification. Route protection uses `useConvexAuth()` in a layout to redirect unauthenticated users. No middleware needed.

**Remove:**
- `middleware.ts`
- `src/lib/auth-bypass.ts` (+ test)
- `src/lib/ip-utils.ts` (+ test)
- `@workos-inc/authkit-nextjs` middleware integration (keep if still using WorkOS for identity)

### 7. Move Reminders to Convex Scheduled Functions

**Current state:** Reminders are stored in a `reminders` table with `remindAt` timestamps, but there's no actual notification delivery mechanism — they're just stored records.

**Convex replacement:** Use `ctx.scheduler.runAt(remindAt, internal.reminders.send, { taskId })` to schedule actual delivery when a reminder is created. The reminder fires as a Convex function at the specified time, enabling push notifications, email, or in-app alerts. No external cron needed.

### 8. Move Analytics to a Real-Time Convex Query

**Current state:** A 278-line Server Action that does single-pass aggregation over all user tasks and time entries, computing completion rates, priority distributions, heatmaps, and time tracking stats.

**Convex replacement:** Implement as a Convex query. Benefits:
- **Real-time dashboard:** Analytics update live as tasks are completed (no page refresh)
- **Reactive cache:** Convex caches query results and only re-executes when underlying data changes
- Alternatively, pre-compute aggregates in a `userAnalytics` table via trigger-style mutations for O(1) reads

**Remove:**
- `src/lib/analytics.ts`

### 9. Move Weekly Review to a Convex Cron + Action

**Current state:** `weekly-review.ts` is a Server Action that fetches completed tasks, calls Gemini, and returns a motivational report. Triggered manually.

**Convex replacement:** Register as a Convex cron that runs weekly. Results are stored in a `weeklyReviews` table for the user to read anytime:

```typescript
// convex/crons.ts
crons.weekly("weekly-review",
  { dayOfWeek: "sunday", hourUTC: 20, minuteUTC: 0 },
  internal.ai.actions.generateWeeklyReviews
);
```

**Remove:**
- `src/lib/weekly-review.ts`

### 10. Move Habit Streaks to Denormalized Fields

**Current state:** `src/lib/habits.ts` fetches up to a year of habit completions and calculates streaks in a loop — O(n) per read.

**Convex replacement:** Maintain `currentStreak` and `bestStreak` as denormalized fields on the task document, updated via a mutation when a habit is completed. Streak reads become O(1).

**Remove:**
- `src/lib/habits.ts` (logic moves to `convex/habits/mutations.ts`)

### 11. Move Time Export to a Convex Action

**Current state:** `time-export.ts` is a Server Action that queries time entries, joins with task titles, and generates JSON/CSV.

**Convex replacement:** A Convex action that reads data via `ctx.runQuery` and formats the export. Also enables scheduled exports (e.g., weekly CSV email via cron).

**Remove:**
- `src/lib/time-export.ts`

### 12. Remove `OnboardingProvider` localStorage — Use Convex User Record

**Current state:** Onboarding completion tracked in `localStorage` — doesn't persist across devices/browsers.

**Convex replacement:** Add `onboardingCompleted: v.optional(v.boolean())` to the `users` table. Cross-device persistent and queryable.

### 13. Update CSP for Convex WebSocket

**Current state:** `next.config.ts` has a strict CSP that will block Convex connections.

**Required change:** Add Convex domains to CSP:

```
connect-src 'self' https://*.convex.cloud wss://*.convex.cloud;
```

### Summary: Total Removable Code

| Category | Files Removed | Lines Saved (approx) |
|----------|--------------|---------------------|
| Zod validation schemas | 4 files | ~150 |
| ActionResult / error infrastructure | 3 files | ~400 |
| Rate limiting | 2 files | ~120 |
| Environment validation | 1 file | ~95 |
| UserProvider context | 1 file | ~90 |
| Middleware + auth bypass | 4 files | ~220 |
| Analytics Server Action | 1 file | ~280 |
| Weekly review | 1 file | ~100 |
| Habits | 1 file | ~125 |
| Time export | 1 file | ~185 |
| **Total** | **~19 files** | **~1,765 lines** |

These are **in addition to** the ~30 files already planned for removal in Phase 8 (sync layer, stores, Drizzle schema, etc.), bringing the total to **~50 files and ~4,000+ lines removed**.
