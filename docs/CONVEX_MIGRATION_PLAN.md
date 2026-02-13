# Convex Migration Plan: Todo Gemini

> **Migrating from**: Neon PostgreSQL + Drizzle ORM + Next.js Server Actions + WorkOS AuthKit + Zustand/IndexedDB offline sync  
> **Migrating to**: Convex (database, real-time sync, backend functions, scheduling) + Convex Auth or WorkOS via Convex  
> **Estimated effort**: 4–6 weeks for a team of 1–2 engineers

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

## 1. Executive Summary

### Why Convex?

| Current Pain Point | Convex Solution |
|---|---|
| Custom offline-first sync system (Zustand + IndexedDB + SyncProvider) | Convex handles real-time sync automatically via WebSocket subscriptions |
| Manual `revalidatePath` after every mutation | `useQuery` subscriptions update UI automatically |
| Separate SQLite schema for tests | Convex has built-in testing utilities; no schema duplication |
| Complex Server Action boilerplate (`"use server"`, auth checks, error handling) | Convex mutations with built-in auth context (`ctx.auth`) |
| No real-time updates without polling or manual refresh | Every `useQuery` is a live subscription |
| React Query for client-side caching | Replaced by Convex's reactive cache |

### What Changes

- **Database**: Neon PostgreSQL → Convex document database
- **ORM**: Drizzle ORM → Convex's built-in `ctx.db` API
- **Backend functions**: Next.js Server Actions → Convex queries/mutations/actions
- **Auth**: WorkOS AuthKit middleware → WorkOS JWT verification in Convex (or Convex Auth)
- **Client data**: Zustand stores + React Query + IndexedDB → Convex `useQuery`/`useMutation` hooks
- **Offline sync**: Custom SyncProvider → Convex optimistic updates (built-in)
- **AI features**: Server Actions calling Gemini → Convex actions calling Gemini

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

| Table | Rows/User | Relationships | Notes |
|---|---|---|---|
| `users` | 1 | Parent of all | WorkOS user data + preferences |
| `tasks` | Many | → lists, self-referencing (parentId) | Core entity, 12+ indexed columns |
| `lists` | ~5-20 | → users | Task groupings |
| `labels` | ~5-20 | → users | Tag system |
| `taskLabels` | Many | → tasks, labels | Junction table (M2M) |
| `taskDependencies` | Some | → tasks (self) | Junction table (M2M) |
| `reminders` | Some | → tasks | Future alerts |
| `taskLogs` | Many | → users, tasks, lists, labels | Activity audit log |
| `habitCompletions` | Some | → tasks | Habit tracking |
| `templates` | Few | → users | Task templates (JSON content) |
| `userStats` | 1 | → users | XP, level, streaks |
| `achievements` | Static | — | Global achievement definitions |
| `userAchievements` | Some | → users, achievements | Junction table |
| `viewSettings` | ~5-10 | → users | Per-view filter/sort state |
| `savedViews` | Few | → users | Custom saved view configs |
| `timeEntries` | Many | → tasks, users | Work session tracking |
| `rateLimits` | Transient | — | API rate limiting |
| `customIcons` | Few | → users | User-uploaded icons |
| `externalIntegrations` | Few | → users | Todoist/Google Tasks tokens |
| `externalSyncState` | Few | → users | Sync cursor state |
| `externalEntityMap` | Many | → users | ID mapping for external sync |
| `externalSyncConflicts` | Few | → users | Unresolved sync conflicts |

### Server Action Modules (20+ files)

- `tasks/` (queries, mutations, subtasks, streak)
- `lists.ts`, `labels.ts`
- `gamification.ts`, `time-tracking.ts`
- `search.ts`, `view-settings.ts`, `views.ts`
- `templates.ts`, `reminders.ts`, `dependencies.ts`, `logs.ts`
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
│  │ (preloaded    │  │ (useQuery,   │  │  (Convex Auth  │  │
│  │  queries)     │  │  useMutation) │  │   or WorkOS)  │  │
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
          └── preloadQuery (SSR, optional)
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

Add scripts to `package.json`:

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

Create `src/components/providers/ConvexClientProvider.tsx` with auth wiring from day one. Convex functions in this plan depend on `ctx.auth.getUserIdentity()`.

```tsx
"use client";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth } from "convex/react";
import { ReactNode } from "react";
import { useWorkOSAuth } from "./useWorkOSAuth"; // Custom hook to return isLoading/isAuthenticated/fetchAccessToken

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useWorkOSAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
```

Wrap in `src/app/layout.tsx` alongside existing providers (can co-exist during migration).

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

#### 0.6 WorkOS ID Token Flow (Required)

Convex needs an OIDC **ID token**. If WorkOS AuthKit only provides a session cookie, add a server route that exchanges the session for an ID token and use it in `useWorkOSAuth.fetchAccessToken`. Ensure SSR helpers can access the same token for `preloadQuery`.

**Example: ID Token Exchange Route + Client/SSR Helpers**

```ts
// src/app/api/convex-token/route.ts
import { NextResponse } from "next/server";
import { withAuth } from "@workos-inc/authkit-nextjs";

export async function GET() {
  const { user, getAccessToken } = await withAuth();
  if (!user) {
    return NextResponse.json({ token: null }, { status: 401 });
  }

  // WorkOS AuthKit can return an ID token via getAccessToken when configured for OIDC.
  const token = await getAccessToken({ template: "convex" });
  return NextResponse.json({ token });
}
```

```tsx
// src/components/providers/useWorkOSAuth.ts
"use client";
import { useCallback, useMemo, useState, useEffect } from "react";

export function useWorkOSAuth() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;
    fetch("/api/convex-token")
      .then((res) => {
        if (!mounted) return;
        setIsAuthenticated(res.ok);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const fetchAccessToken = useCallback(async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
    const response = await fetch("/api/convex-token", {
      headers: forceRefreshToken ? { "Cache-Control": "no-cache" } : undefined,
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { token: string | null };
    return data.token;
  }, []);

  return useMemo(() => ({ isLoading, isAuthenticated, fetchAccessToken }), [isLoading, isAuthenticated, fetchAccessToken]);
}
```

```ts
// src/lib/auth-tokens.ts
import { cookies } from "next/headers";

export async function getWorkOSIdToken() {
  const response = await fetch("/api/convex-token", {
    headers: { Cookie: cookies().toString() },
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { token: string | null };
  return data.token;
}
```

**Note:** Adjust `getAccessToken` usage based on WorkOS AuthKit support for ID token templates. If WorkOS cannot mint an ID token in this context, use WorkOS API to exchange the session for an ID token server-side.

#### 0.6.1 SSR Token Retrieval Strategy

For Server Components, avoid relative `fetch("/api/convex-token")` calls. Prefer a server-only helper that reads the WorkOS session and returns the ID token directly:

```ts
// src/lib/auth-tokens.ts (SSR-safe)
import { withAuth } from "@workos-inc/authkit-nextjs";

export async function getWorkOSIdToken() {
  const { user, getAccessToken } = await withAuth();
  if (!user) return null;
  return getAccessToken({ template: "convex" });
}
```

If you must call an API route, construct an absolute URL from `headers()` (`x-forwarded-proto`, `host`) to avoid runtime errors.

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

Create `convex/schema.ts` translating all 19+ Drizzle tables. Preserve `createdAt` where it is used for sorting or analytics, and denormalize `userId` on child/junction tables to avoid N+1 queries.

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─── Users ──────────────────────────────────────────────
  users: defineTable({
    externalId: v.string(),          // WorkOS user ID
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
    dueDate: v.optional(v.number()),         // timestamp ms
    dueDatePrecision: v.optional(v.union(
      v.literal("day"),
      v.literal("week"),
      v.literal("month"),
      v.literal("year"),
    )),
    isCompleted: v.boolean(),
    completedAt: v.optional(v.number()),
    isRecurring: v.boolean(),
    recurringRule: v.optional(v.string()),     // RRule string
    parentId: v.optional(v.id("tasks")),       // For subtasks
    estimateMinutes: v.optional(v.number()),
    position: v.number(),
    actualMinutes: v.optional(v.number()),
    energyLevel: v.optional(v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low"),
    )),
    context: v.optional(v.union(
      v.literal("computer"),
      v.literal("phone"),
      v.literal("errands"),
      v.literal("meeting"),
      v.literal("home"),
      v.literal("anywhere"),
    )),
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
  })
    .index("by_user", ["userId"]),

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
  })
    .index("by_task_date", ["taskId", "completedAt"]),

  // ─── Templates ──────────────────────────────────────────
  templates: defineTable({
    userId: v.id("users"),
    name: v.string(),
    content: v.string(),     // JSON string of task data
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // ─── User Stats ─────────────────────────────────────────
  userStats: defineTable({
    userId: v.id("users"),
    xp: v.number(),
    level: v.number(),
    lastLogin: v.optional(v.number()),
    currentStreak: v.number(),
    longestStreak: v.number(),
    streakFreezes: v.number(),
  })
    .index("by_user", ["userId"]),

  // ─── Achievements ──────────────────────────────────────
  achievements: defineTable({
    achievementId: v.string(),   // Logical ID (e.g., "first_task")
    name: v.string(),
    description: v.string(),
    icon: v.string(),
    conditionType: v.string(),
    conditionValue: v.number(),
    xpReward: v.number(),
  })
    .index("by_achievementId", ["achievementId"]),

  // ─── User Achievements ─────────────────────────────────
  userAchievements: defineTable({
    userId: v.id("users"),
    achievementId: v.id("achievements"),
    unlockedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_achievement", ["userId", "achievementId"]),

  // ─── View Settings ─────────────────────────────────────
  viewSettings: defineTable({
    userId: v.id("users"),
    viewId: v.string(),
    layout: v.optional(v.union(v.literal("list"), v.literal("board"), v.literal("calendar"))),
    showCompleted: v.optional(v.boolean()),
    groupBy: v.optional(v.union(
      v.literal("none"), v.literal("dueDate"),
      v.literal("priority"), v.literal("label"),
    )),
    sortBy: v.optional(v.union(
      v.literal("manual"), v.literal("dueDate"),
      v.literal("priority"), v.literal("name"), v.literal("created"),
    )),
    sortOrder: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
    filterDate: v.optional(v.union(v.literal("all"), v.literal("hasDate"), v.literal("noDate"))),
    filterPriority: v.optional(v.string()),
    filterLabelId: v.optional(v.id("labels")),
    filterEnergyLevel: v.optional(v.union(v.literal("high"), v.literal("medium"), v.literal("low"))),
    filterContext: v.optional(v.union(
      v.literal("computer"), v.literal("phone"), v.literal("errands"),
      v.literal("meeting"), v.literal("home"), v.literal("anywhere"),
    )),
    updatedAt: v.optional(v.number()),
  })
    .index("by_user_view", ["userId", "viewId"]),

  // ─── Saved Views ────────────────────────────────────────
  savedViews: defineTable({
    userId: v.id("users"),
    name: v.string(),
    icon: v.optional(v.string()),
    settings: v.string(),        // JSON string
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]),

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
  })
    .index("by_user", ["userId"]),

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
    status: v.union(v.literal("idle"), v.literal("syncing"), v.literal("error")),
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
      v.literal("task"), v.literal("list"),
      v.literal("label"), v.literal("list_label"),
    ),
    localId: v.optional(v.string()),   // Convex ID as string
    externalId: v.string(),
    externalParentId: v.optional(v.string()),
    externalEtag: v.optional(v.string()),
    externalUpdatedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_externalId", ["userId", "provider", "externalId"])
    .index("by_localId", ["localId"]),

  // ─── External Sync Conflicts ───────────────────────────
  externalSyncConflicts: defineTable({
    userId: v.id("users"),
    provider: v.union(v.literal("todoist"), v.literal("google_tasks")),
    entityType: v.union(v.literal("task"), v.literal("list"), v.literal("label")),
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
  rateLimits: defineTable({
    key: v.string(),
    count: v.number(),
    lastRequest: v.number(),
  })
    .index("by_key", ["key"]),
});
```

#### 1.2 Key Schema Decisions

| Decision | Rationale |
|---|---|
| **Timestamps as `v.number()`** | Convex stores timestamps as milliseconds (numbers). Use `Date.now()` in mutations. Keep explicit `createdAt` fields where the app sorts or filters by creation time; `_creationTime` is available but not a full replacement. |
| **`v.id("table")` for foreign keys** | Type-safe references. No cascading deletes — handle in mutations. |
| **Keep junction tables** | `taskLabels` and `taskDependencies` remain as separate tables with indexes on both sides. |
| **`externalId` on users** | Store WorkOS user ID as `externalId`, use Convex's `_id` as the internal reference everywhere. |
| **Search indexes on tasks** | Replace PostgreSQL text indexes with Convex `searchIndex` for full-text search. |
| **No rate limits table (future)** | Consider using Convex's built-in rate limiting or a scheduled cleanup instead. |
| **Denormalize `userId` on child tables** | Avoid N+1 queries and simplify access control checks in Convex (no joins). |

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
8. `reminders`, `taskLogs`, `habitCompletions`
9. `userStats`, `userAchievements`, `viewSettings`, `savedViews`
10. `timeEntries`, `templates`, `customIcons`
11. `externalIntegrations`, `externalSyncState`, `externalEntityMap`, `externalSyncConflicts`
12. `rateLimits` (optional — can start fresh)

#### 1.4 Parallel Run + Delta Sync

If you plan to run Postgres and Convex in parallel for weeks, add a delta sync step that replays changes since the initial import. Options:
- Dual-write all mutations and reconcile by source-of-truth timestamps.
- Poll a changelog table in Postgres and apply deltas in Convex.
- Freeze writes briefly during cutover to avoid drift.

**Recommendation:** Prefer a short cutover window with a write freeze + delta import if possible. Dual-write is high effort and introduces reconciliation complexity.

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
**Duration**: 5–7 days (largest phase)

#### 2.1 File Structure

```
convex/
├── schema.ts
├── auth.config.ts          # Auth provider config
├── helpers.ts              # Shared helpers (auth check, ownership)
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

export async function createList(data: { name: string; color?: string; icon?: string }) {
  const user = await requireAuth();
  const slug = data.name.toLowerCase().replace(/\s+/g, "-");
  const [newList] = await db.insert(lists).values({
    userId: user.id,
    name: data.name,
    color: data.color ?? "#000000",
    icon: data.icon,
    slug,
    position: 0,
  }).returning();
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_externalId", (q) => q.eq("externalId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

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
  ctx: QueryCtx | MutationCtx
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const user = await ctx.db
    .query("users")
    .withIndex("by_externalId", (q) =>
      q.eq("externalId", identity.subject)
    )
    .unique();

  if (!user) throw new Error("User not found");
  return user;
}

export async function requireOwnership(
  ctx: QueryCtx | MutationCtx,
  userId: any, // Doc["users"]["_id"]
  resourceUserId: any
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
- `taskLogs`: filter by `userId`.
- `habitCompletions`: filter by `userId` and validate `taskId` ownership.
- `templates`: filter by `userId` and validate ownership on get/update/delete.
- `userStats`: filter by `userId` and ensure single row per user.
- `userAchievements`: filter by `userId` and validate `achievementId` exists.
- `viewSettings`/`savedViews`: filter by `userId` and validate ownership.
- `timeEntries`: filter by `userId` and validate `taskId` ownership.
- `customIcons`: filter by `userId`.
- `externalIntegrations`/`externalSyncState`/`externalEntityMap`/`externalSyncConflicts`: use `internal` queries for token reads and always scope by `userId`.

#### 2.4 Cascading Deletes

Convex doesn't have automatic cascading deletes. Implement manually in mutations:

```typescript
// convex/lists/mutations.ts
export const deleteList = mutation({
  args: { listId: v.id("lists") },
  handler: async (ctx, args) => {
    const user = await getAuthUser(ctx);
    const list = await ctx.db.get(args.listId);
    if (!list || list.userId !== user._id) throw new Error("Not found");

    // 1. Delete all tasks in this list
    const tasksInList = await ctx.db
      .query("tasks")
      .withIndex("by_list", (q) => q.eq("userId", user._id).eq("listId", args.listId))
      .collect();

    for (const task of tasksInList) {
      // Delete task's labels, dependencies, reminders, time entries, etc.
      await deleteTaskCascade(ctx, task._id);
    }

    // 2. Delete the list itself
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
        q.search("title", args.query).eq("userId", user._id)
      )
      .take(20);

    const descResults = await ctx.db
      .query("tasks")
      .withSearchIndex("search_description", (q) =>
        q.search("description", args.query).eq("userId", user._id)
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

---

### Phase 3: Authentication
**Duration**: 1–2 days

#### Option A: Keep WorkOS AuthKit (Recommended for minimal disruption)

Configure Convex to verify WorkOS OIDC ID tokens. Ensure you are minting an ID token on the client (not just an access token) for Convex to validate.

```typescript
// convex/auth.config.ts
export default {
  providers: [
    {
      domain: process.env.WORKOS_ISSUER_URL,   // e.g., "https://api.workos.com"
      applicationID: "convex",
    },
  ],
};
```

Update the Next.js middleware to pass WorkOS tokens to the Convex client:

```typescript
// src/components/providers/ConvexClientProvider.tsx
"use client";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth } from "convex/react";
import { useWorkOSAuth } from "./useWorkOSAuth"; // Custom hook

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({ children }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useWorkOSAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
```

**Search limits note:** Convex search indexes return at most 1024 results and have query term limits. Add pagination + UI messaging for truncated results if you expect large datasets.

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

### Phase 4: Real-Time & Client Integration
**Duration**: 3–5 days

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

**Pagination note:** Convex queries have execution and scan limits. For `tasks`, `taskLogs`, and `timeEntries`, use cursor-based pagination (`take` + `startAfter`) rather than unbounded `collect()` in production.

**Access control note:** Ensure every public query/mutation scopes by `userId` (or verifies ownership) before returning data. Add `internal` functions for cross-user admin or sync jobs only.

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

#### 4.3 Remove SyncProvider + IndexedDB

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
const createTask = useMutation(api.tasks.mutations.createTask)
  .withOptimisticUpdate((localStore, args) => {
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

#### 4.6 Server Component Integration (SSR)

For pages that need SSR, use `preloadQuery` and `usePreloadedQuery` with proper auth token forwarding. Authenticated queries require explicitly passing a token during SSR.

```tsx
// src/app/inbox/page.tsx
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import InboxClient from "./InboxClient";
import { getWorkOSIdToken } from "@/lib/auth-tokens"; // Example helper

export default async function InboxPage() {
  const token = await getWorkOSIdToken();
  const preloadedTasks = await preloadQuery(
    api.tasks.queries.getTasksByList,
    { listSlug: "inbox" },
    { token }
  );
  return <InboxClient preloadedTasks={preloadedTasks} />;
}
```

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
      internal.tasks.queries.getOverdueTasks
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
**Duration**: 1 day

With Convex, the custom offline-first architecture is no longer needed. Convex automatically:
- Queues mutations when offline
- Replays them when reconnected
- Handles conflicts at the mutation level (last-write-wins or custom logic)

**Important:** Convex conflict handling is still last-write-wins unless you implement custom merge logic in mutations. Identify any flows that currently surface conflicts in the UI and decide whether to keep a simplified conflict dialog.

**Remove:**

| File/Directory | Replacement |
|---|---|
| `src/lib/sync/db.ts` | Convex built-in |
| `src/lib/sync/registry.ts` | `api.*` auto-generated |
| `src/lib/sync/types.ts` | Not needed |
| `src/lib/store/task-store.ts` | `useQuery` |
| `src/lib/store/list-store.ts` | `useQuery` |
| `src/lib/store/label-store.ts` | `useQuery` |
| `src/components/providers/sync-provider.tsx` | Not needed |
| `src/components/providers/QueryProvider.tsx` | `ConvexProvider` |
| `src/components/sync/SyncStatus.tsx` | Optional Convex connection status |
| `src/components/sync/ConflictDialog.tsx` | Not needed (or simplified) |
| `idb` dependency | Remove from package.json |
| `zustand` dependency | Remove if no other uses |
| `@tanstack/react-query` dependency | Remove |

**Add (optional):** A simple connection status indicator:

```tsx
import { useConvex } from "convex/react";

function ConnectionStatus() {
  // Convex automatically handles reconnection
  return null; // Or show a minimal indicator
}
```

---

### Phase 7: External Integrations
**Duration**: 2–3 days

Todoist and Google Tasks sync become Convex **actions** (since they call external APIs) + **scheduled functions** for periodic sync:

```typescript
// convex/integrations/todoist.ts
import { action } from "../_generated/server";
import { internal } from "../_generated/api";

export const syncFromTodoist = action({
  handler: async (ctx) => {
    // 1. Get integration credentials via internal query
    const integration = await ctx.runQuery(
      internal.integrations.queries.getIntegration,
      { provider: "todoist" }
    );

    // 2. Call Todoist API
    const todoistData = await fetch("https://api.todoist.com/sync/v9/sync", {
      headers: { Authorization: `Bearer ${integration.accessToken}` },
    });

    // 3. Process and write to Convex via internal mutation
    await ctx.runMutation(
      internal.integrations.mutations.processTodoistSync,
      { data: await todoistData.json() }
    );
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
  internal.integrations.todoist.syncFromTodoist
);

export default crons;
```

#### Encryption Considerations

The current app uses AWS KMS for token encryption. In Convex:
- Environment variables are encrypted at rest
- Keep KMS envelope encryption for access/refresh tokens stored in Convex tables
- Restrict token reads to `internal` queries/actions; avoid exposing integration tokens via public queries

---

### Phase 8: Testing & Cleanup
**Duration**: 2–3 days

#### 8.1 Unit Testing Convex Functions

Use Convex's testing utilities:

```typescript
// convex/tests/tasks.test.ts
import { convexTest } from "convex-test";
import { expect, test } from "vitest";
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

#### 8.2 Switch Test Runner

- Current: Bun test with in-memory SQLite
- New: Vitest (recommended by Convex) or adapt to Bun test with `convex-test`

#### 8.3 E2E Tests

Playwright E2E tests largely stay the same — they test the UI, not the backend implementation. Update:
- Remove test-auth API route (use Convex auth testing patterns instead)
- Update `e2e/fixtures.ts` for Convex-compatible auth setup
- Ensure E2E can mint/attach an ID token for Convex auth (WorkOS or Clerk) to avoid `ctx.auth.getUserIdentity()` returning null

#### 8.3.1 Auth Test Mode Strategy

Define one of the following for deterministic E2E auth:
- WorkOS test tenant with a scripted login + token extraction
- A server-only Convex `internal` test auth mutation gated by `E2E_TEST_MODE` that issues a temporary token
- Clerk/Convex test tokens (if you switch auth providers)

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
src/lib/rate-limit.ts            # Use Convex rate limiting

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
src/test/setup.ts                # Replace with convex-test setup
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
  "add": [
    "convex",
    "convex-test"
  ]
}
```

#### 8.6 Convex Backup Rehearsal

Before cutover, run an export from Convex and verify you can re-import into a staging deployment. This validates data safety and rollback readiness.

---

## 5. Schema Translation Reference

| Drizzle (PostgreSQL) | Convex | Notes |
|---|---|---|
| `serial("id").primaryKey()` | `_id` (automatic) | Auto-generated `Id<"table">` |
| `text("col").notNull()` | `v.string()` | Required by default |
| `text("col")` (nullable) | `v.optional(v.string())` | Omit field = not present |
| `integer("col")` | `v.number()` | JS number (float64) |
| `boolean("col")` | `v.boolean()` | |
| `timestamp("col").defaultNow()` | `_creationTime` | Automatic, milliseconds |
| `timestamp("col")` | `v.number()` | Store as `Date.now()` |
| `.default("value")` | Set in mutation code | No schema-level defaults |
| `text("col", { enum: [...] })` | `v.union(v.literal(...), ...)` | Union of literals |
| `.references(() => table.id)` | `v.id("table")` | Type-safe, no enforcement |
| `primaryKey({ columns: [a, b] })` | Separate table + index | Convex has no composite PKs |
| `index("name").on(col)` | `.index("name", ["col"])` | Chained on table definition |
| `uniqueIndex(...)` | Check uniqueness in mutation | No unique constraints |
| `.onDelete("cascade")` | Implement in mutation | Manual cascade |
| `.$onUpdate(() => new Date())` | Set `updatedAt: Date.now()` in mutation | Manual |
| `foreignKey({ columns, foreignColumns })` | Document relationship via `v.id()` | No composite FKs |

---

## 6. Function Migration Map

### Queries (read-only, real-time subscriptions)

| Server Action | Convex Query | File |
|---|---|---|
| `getTasks()` | `api.tasks.queries.getTasks` | `convex/tasks/queries.ts` |
| `getTask(id)` | `api.tasks.queries.getTask` | `convex/tasks/queries.ts` |
| `searchTasks(q)` | `api.search.queries.searchTasks` | `convex/search/queries.ts` |
| `getTasksForSearch()` | `api.tasks.queries.getTasksForSearch` | `convex/tasks/queries.ts` |
| `getSubtasks(parentId)` | `api.tasks.subtasks.getSubtasks` | `convex/tasks/subtasks.ts` |
| `getLists()` | `api.lists.queries.getLists` | `convex/lists/queries.ts` |
| `getList(id)` | `api.lists.queries.getList` | `convex/lists/queries.ts` |
| `getLabels()` | `api.labels.queries.getLabels` | `convex/labels/queries.ts` |
| `getLabel(id)` | `api.labels.queries.getLabel` | `convex/labels/queries.ts` |
| `getUserStats()` | `api.gamification.queries.getUserStats` | `convex/gamification/queries.ts` |
| `getAchievements()` | `api.gamification.queries.getAchievements` | `convex/gamification/queries.ts` |
| `getUserAchievements()` | `api.gamification.queries.getUserAchievements` | `convex/gamification/queries.ts` |
| `getReminders(taskId)` | `api.reminders.queries.getReminders` | `convex/reminders/queries.ts` |
| `getBlockers(taskId)` | `api.dependencies.queries.getBlockers` | `convex/dependencies/queries.ts` |
| `getBlockedTasks(taskId)` | `api.dependencies.queries.getBlockedTasks` | `convex/dependencies/queries.ts` |
| `getViewSettings(viewId)` | `api.views.queries.getViewSettings` | `convex/views/queries.ts` |
| `getTemplates()` | `api.templates.queries.getTemplates` | `convex/templates/queries.ts` |
| `getTaskLogs()` | `api.logs.queries.getTaskLogs` | `convex/logs/queries.ts` |
| `getActivityLog()` | `api.logs.queries.getActivityLog` | `convex/logs/queries.ts` |
| `getCompletionHistory()` | `api.logs.queries.getCompletionHistory` | `convex/logs/queries.ts` |
| `getTimeEntries()` | `api.time.queries.getTimeEntries` | `convex/time/queries.ts` |
| `getActiveTimeEntry()` | `api.time.queries.getActiveTimeEntry` | `convex/time/queries.ts` |
| `getTimeStats()` | `api.time.queries.getTimeStats` | `convex/time/queries.ts` |
| `searchAll(q)` | `api.search.queries.searchAll` | `convex/search/queries.ts` |

### Mutations (transactional writes)

| Server Action | Convex Mutation | File |
|---|---|---|
| `createTask(data)` | `api.tasks.mutations.createTask` | `convex/tasks/mutations.ts` |
| `updateTask(id, data)` | `api.tasks.mutations.updateTask` | `convex/tasks/mutations.ts` |
| `deleteTask(id)` | `api.tasks.mutations.deleteTask` | `convex/tasks/mutations.ts` |
| `toggleTaskCompletion(id)` | `api.tasks.mutations.toggleCompletion` | `convex/tasks/mutations.ts` |
| `createSubtask(...)` | `api.tasks.subtasks.createSubtask` | `convex/tasks/subtasks.ts` |
| `updateSubtask(...)` | `api.tasks.subtasks.updateSubtask` | `convex/tasks/subtasks.ts` |
| `deleteSubtask(id)` | `api.tasks.subtasks.deleteSubtask` | `convex/tasks/subtasks.ts` |
| `updateStreak()` | `api.tasks.streak.updateStreak` | `convex/tasks/streak.ts` |
| `createList(data)` | `api.lists.mutations.createList` | `convex/lists/mutations.ts` |
| `updateList(id, data)` | `api.lists.mutations.updateList` | `convex/lists/mutations.ts` |
| `deleteList(id)` | `api.lists.mutations.deleteList` | `convex/lists/mutations.ts` |
| `reorderLists(ids)` | `api.lists.mutations.reorderLists` | `convex/lists/mutations.ts` |
| `createLabel(data)` | `api.labels.mutations.createLabel` | `convex/labels/mutations.ts` |
| `updateLabel(id, data)` | `api.labels.mutations.updateLabel` | `convex/labels/mutations.ts` |
| `deleteLabel(id)` | `api.labels.mutations.deleteLabel` | `convex/labels/mutations.ts` |
| `reorderLabels(ids)` | `api.labels.mutations.reorderLabels` | `convex/labels/mutations.ts` |
| `addXP(amount)` | `api.gamification.mutations.addXP` | `convex/gamification/mutations.ts` |
| `checkAchievements()` | `api.gamification.mutations.checkAchievements` | `convex/gamification/mutations.ts` |
| `saveViewSettings(...)` | `api.views.mutations.saveViewSettings` | `convex/views/mutations.ts` |
| `resetViewSettings(...)` | `api.views.mutations.resetViewSettings` | `convex/views/mutations.ts` |
| `createReminder(...)` | `api.reminders.mutations.createReminder` | `convex/reminders/mutations.ts` |
| `deleteReminder(id)` | `api.reminders.mutations.deleteReminder` | `convex/reminders/mutations.ts` |
| `addDependency(...)` | `api.dependencies.mutations.addDependency` | `convex/dependencies/mutations.ts` |
| `removeDependency(...)` | `api.dependencies.mutations.removeDependency` | `convex/dependencies/mutations.ts` |
| `createTemplate(...)` | `api.templates.mutations.createTemplate` | `convex/templates/mutations.ts` |
| `updateTemplate(...)` | `api.templates.mutations.updateTemplate` | `convex/templates/mutations.ts` |
| `deleteTemplate(id)` | `api.templates.mutations.deleteTemplate` | `convex/templates/mutations.ts` |
| `instantiateTemplate(id)` | `api.templates.mutations.instantiateTemplate` | `convex/templates/mutations.ts` |
| `startTimeEntry(...)` | `api.time.mutations.startTimeEntry` | `convex/time/mutations.ts` |
| `stopTimeEntry(id)` | `api.time.mutations.stopTimeEntry` | `convex/time/mutations.ts` |
| `createManualTimeEntry(...)` | `api.time.mutations.createManualEntry` | `convex/time/mutations.ts` |
| `updateTimeEntry(...)` | `api.time.mutations.updateTimeEntry` | `convex/time/mutations.ts` |
| `deleteTimeEntry(id)` | `api.time.mutations.deleteTimeEntry` | `convex/time/mutations.ts` |
| `updateTaskEstimate(...)` | `api.time.mutations.updateTaskEstimate` | `convex/time/mutations.ts` |
| `updateUserPreferences(...)` | `api.user.mutations.updatePreferences` | `convex/user/mutations.ts` |

### Actions (external API calls / side effects)

| Server Action | Convex Action | File |
|---|---|---|
| `parseVoiceCommand(text)` | `api.ai.actions.parseVoiceCommand` | `convex/ai/actions.ts` |
| `rescheduleOverdueTasks()` | `api.ai.actions.rescheduleOverdueTasks` | `convex/ai/actions.ts` |
| `extractDeadline(text)` | `api.ai.actions.extractDeadline` | `convex/ai/actions.ts` |
| `suggestSubtasks(task)` | `api.ai.actions.suggestSubtasks` | `convex/ai/actions.ts` |
| `scheduleUnscheduledTasks()` | `api.ai.actions.scheduleUnscheduled` | `convex/ai/actions.ts` |
| `suggestMetadata(title)` | `api.ai.actions.suggestMetadata` | `convex/ai/actions.ts` |
| Todoist sync | `api.integrations.todoist.sync` | `convex/integrations/todoist.ts` |
| Google Tasks sync | `api.integrations.googleTasks.sync` | `convex/integrations/googleTasks.ts` |

---

## 7. What Gets Removed

### Dependencies Removed (~7)

| Package | Replacement |
|---|---|
| `@neondatabase/serverless` | Convex DB |
| `drizzle-orm` | Convex `ctx.db` |
| `drizzle-kit` (dev) | Convex schema auto-sync |
| `@tanstack/react-query` | Convex `useQuery` |
| `zustand` | Convex `useQuery` (if no other uses) |
| `idb` | Not needed |
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
- `src/test/setup.ts`
- `drizzle/` (migration files)
- `drizzle.config.ts`

### Concepts Removed

| Concept | Why |
|---|---|
| `revalidatePath("/")` | Convex subscriptions auto-update |
| `"use server"` directive | Convex functions run on Convex backend |
| SQLite test schema | Convex has its own test utilities |
| IndexedDB offline queue | Convex handles offline automatically |
| Zustand client cache | Convex reactive cache replaces it |
| React Query caching | Convex's own reactive system |
| Manual WebSocket/polling | Convex WebSocket is automatic |
| Drizzle migration files | Convex schema is pushed, not migrated |

---

## 8. Risk Assessment

| Risk | Severity | Mitigation |
|---|---|---|
| **Data loss during migration** | High | Run PostgreSQL and Convex in parallel during transition. Verify row counts match. |
| **ID format change** (serial → Convex ID) | High | Build comprehensive ID mapping. Update all client-side ID references. |
| **Auth token compatibility** | Medium | Test WorkOS JWT verification with Convex thoroughly before switching. |
| **Performance regression** | Medium | Convex indexes must cover all current query patterns. Benchmark critical paths. |
| **No cascading deletes** | Medium | Implement and test all cascade paths manually in mutations. |
| **No unique constraints** | Medium | Enforce uniqueness in mutations (check-then-insert). Possible race conditions — accept or use transactions. |
| **Convex query limits** | Low | Convex queries have time limits. Paginate large result sets. |
| **Auth token mismatch** | Medium | Verify WorkOS `iss`/`aud` against tokens; ensure Convex receives ID tokens from the client. |
| **Data divergence during dual-write** | Medium | Define a single source of truth, or implement ordered dual-write + reconciliation strategy. |
| **External integration downtime** | Low | Migrate integrations last. Can run on old Server Actions temporarily. |
| **E2E test breakage** | Low | UI tests are implementation-agnostic. Update auth fixtures only. |
| **Convex vendor lock-in** | Strategic | Convex schema is TypeScript — data can be exported. Evaluate against open-source alternatives. |

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

- [ ] **Phase 0**: `convex init`, ConvexProvider, env vars
- [ ] **Phase 0**: Verify WorkOS ID token flow (`iss`/`aud`) and `ctx.auth.getUserIdentity()`
- [ ] **Phase 1**: Schema in `convex/schema.ts`, data migration script
- [ ] **Phase 1**: Chunked + resumable import with id-map persistence
- [ ] **Phase 2**: All 50+ Server Actions → Convex functions
  - [ ] Tasks (CRUD, subtasks, search, reorder)
  - [ ] Lists (CRUD, reorder)
  - [ ] Labels (CRUD, reorder)
  - [ ] Gamification (stats, XP, achievements)
  - [ ] Time tracking (entries, stats)
  - [ ] Views (settings, saved views)
  - [ ] Templates (CRUD, instantiate)
  - [ ] Reminders (CRUD)
  - [ ] Dependencies (add, remove, query)
  - [ ] Logs (activity, completion history)
  - [ ] Search (full-text)
  - [ ] User (preferences, sync)
- [ ] **Phase 3**: Authentication (WorkOS JWT or Clerk migration)
- [ ] **Phase 4**: Client components → Convex hooks
  - [ ] Remove React Query
  - [ ] Remove Zustand stores
  - [ ] Remove SyncProvider + IndexedDB
  - [ ] Add optimistic updates where needed
- [ ] **Phase 5**: AI actions → Convex actions
- [ ] **Phase 6**: Delete offline sync layer
- [ ] **Phase 7**: External integrations → Convex actions + crons
- [ ] **Phase 8**: Testing + cleanup
  - [ ] New test setup with `convex-test`
  - [ ] E2E tests passing
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
4. SSR proof: call `getWorkOSIdToken()` in a Server Component and successfully `preloadQuery` an authenticated query.

### B. Migration Dry Run (Required)

1. Run migration against a **copy** of Postgres and a Convex dev deployment.
2. For each table, compare counts and sample 100 random records to verify field-level correctness.
3. Verify ID maps are complete by checking any foreign key in Convex resolves to a valid target doc.
4. Simulate a failure mid-batch and verify the migration can resume without duplicate inserts.

### C. Data Integrity Checks (Required)

- All tasks have a valid `userId` and (if present) `listId`.
- All junction tables (`taskLabels`, `taskDependencies`) reference valid task/label IDs and share `userId`.
- All external integration rows are readable only by `internal` functions.

### D. Performance Smoke Tests (Required)

- Run `getTasks` with pagination in a dataset >10k tasks and confirm no timeout.
- Run `searchTasks` on a large dataset and verify truncation messaging when capped.

### E. E2E Auth Harness (Required)

Choose one strategy and fully automate it:
- WorkOS test tenant login + token extraction
- Convex `internal` test auth mutation gated by `E2E_TEST_MODE`
- Clerk test token flow (if migrating auth)

### F. Cutover Checklist (Required)

1. Freeze writes on Postgres.
2. Run delta import.
3. Run integrity + sample checks.
4. Flip feature flag to Convex.
5. Monitor errors/latency and rollback if required.
