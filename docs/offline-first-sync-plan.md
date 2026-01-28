# Offline-First Background Sync Plan

> **Goal**: Make the app feel extremely snappy—every navigation and action happens INSTANTLY.

---

## Implementation Status

### ✅ Completed

| Component | Files | Notes |
|-----------|-------|-------|
| IndexedDB sync queue | `src/lib/sync/db.ts` | Queue store + tasks cache store (v2) |
| Pending action types | `src/lib/sync/types.ts` | `PendingAction`, `SyncStatus` |
| Action registry | `src/lib/sync/registry.ts` | 6 actions registered (tasks only) |
| SyncProvider | `src/components/providers/sync-provider.tsx` | Queue processing, online/offline events, optimistic dispatch |
| Zustand task store | `src/lib/store/task-store.ts` | Client-side task cache with IDB persistence |
| DataLoader | `src/components/providers/data-loader.tsx` | Background fetch to warm cache |
| useOptimisticTasks hook | `src/hooks/use-optimistic-tasks.ts` | Applies pending actions to task list |
| TaskListWithSettings integration | `src/components/tasks/TaskListWithSettings.tsx` | Uses store + optimistic hook |
| PWA with Workbox | `next.config.ts` | `@ducanh2912/next-pwa` configured |

### ❌ Not Started

| Component | Priority | Notes |
|-----------|----------|-------|
| Conflict resolution UI | 🟡 High | No `ConflictDialog`, no 409 handling |
| Offline indicator UI | 🟡 High | `status`/`isOnline` exist but not displayed |
| Extended action registry | 🟢 Medium | Only task actions; missing lists/labels/gamification |
| Optimistic hooks for lists/labels | 🟢 Medium | Only tasks have instant updates |
| Service Worker runtime caching | 🟢 Medium | Default config; no custom `runtimeCaching` |
| Data freshness/staleness logic | 🟢 Medium | No `lastFetched` tracking or SWR pattern |

---

## 🚨 Critical Issues Found (Code Review)

### ✅ Issue 1: Duplicate Optimistic State (RESOLVED)

**Problem**: Two independent optimistic layers existed:
1. `useOptimisticTasks(serverTasks)` — applies pending actions on top of tasks
2. `SyncProvider.dispatch()` — also applies optimistic updates to Zustand store

**Resolution**: Removed `useOptimisticTasks` from TaskListWithSettings. Zustand is now the single source of truth:
- `src/hooks/use-optimistic-tasks.ts` — deprecated with JSDoc warning
- `src/components/tasks/TaskListWithSettings.tsx` — now uses `derivedTasks` directly from store
- `src/components/tasks/TaskItem.tsx` — `dispatch` prop made optional with `useSync()` fallback

---

### Issue 2: Race Condition in Store Initialization (HIGH PRIORITY)

**Problem**: `useTaskStore.initialize()` does `set({ tasks: taskMap })` which **overwrites** any tasks already in state (from SSR or DataLoader fetch).

**Current flow** (problematic):
```
1. SSR renders page with tasks → tasks passed as props
2. TaskListWithSettings mounts → calls setTasks(props.tasks)
3. DataLoader mounts → calls initialize() → OVERWRITES with stale IDB cache
4. DataLoader fetches → calls setTasks(freshTasks)
```

**Fix**: Change `initialize()` to **merge, preferring in-memory state**:

```typescript
initialize: async () => {
  if (get().isInitialized) return;
  try {
    const cached = await getCachedTasks();
    const cachedMap: Record<number, Task> = {};
    cached.forEach(t => { cachedMap[t.id] = t; });

    set(state => ({
      // Prefer state.tasks (SSR/fresh) over cachedMap (stale IDB)
      tasks: { ...cachedMap, ...state.tasks },
      isInitialized: true,
    }));
  } catch (e) {
    console.error("Failed to load tasks from cache", e);
    set({ isInitialized: true });
  }
}
```

**Files to change**:
- `src/lib/store/task-store.ts` — fix `initialize()`
- `src/components/providers/data-loader.tsx` — await initialize before fetch

---

### Issue 3: Context Re-renders (MEDIUM PRIORITY)

**Problem**: `SyncProvider` puts `{pendingActions, status, isOnline, dispatch}` in one context. Every queue change triggers full tree re-render.

**Fix**: 
1. Memoize provider value with `useMemo`
2. (Optional) Split into two contexts: stable `dispatch` vs. changing `status/pendingActions`

```typescript
const value = useMemo(() => ({
  pendingActions,
  dispatch,
  status,
  isOnline
}), [pendingActions, status, isOnline]); // dispatch is stable via useCallback
```

---

### Issue 4: Expensive Operations (LOW-MEDIUM PRIORITY)

| Operation | Location | Complexity | Fix |
|-----------|----------|------------|-----|
| `useOptimisticTasks` loop | `use-optimistic-tasks.ts` | O(A × N) | Remove hook (Issue 1) |
| `fixupQueueIds` JSON.stringify | `sync-provider.tsx:91` | O(Q × payload size) | Return `changed` flag instead of stringify comparison |
| `updateSubtask` find parent | `sync-provider.tsx:241` | O(N tasks) | Keep subtaskId→parentId index (only if subtasks are heavy) |

---

### Issue 5: Stale Closure in Event Listeners (LOW PRIORITY)

**Problem**: `handleOnline` is installed in `useEffect([])` and captures initial `processQueue` reference.

**Current code works** because `processQueue` reads fresh from IDB, but it's fragile.

**Fix**: Wrap `processQueue` in `useCallback` or store in a ref.

---

## Updated Implementation Plan

### Phase 1: Fix Architecture Issues (IMMEDIATE)

| Task | Effort | Priority | Status |
|------|--------|----------|--------|
| 1.1 Remove `useOptimisticTasks` hook, use Zustand directly | 1-2h | 🔴 Critical | ✅ Done |
| 1.2 Fix `initialize()` race condition (merge, not replace) | 30min | 🔴 Critical | ✅ Done |
| 1.3 Memoize SyncProvider context value | 15min | 🟡 High | ✅ Done |
| 1.4 Fix stale closure in event listeners | 15min | 🟢 Medium | ✅ Done |

### Phase 2: Extend Optimistic Coverage

| Task | Effort | Priority | Status |
|------|--------|----------|--------|
| 2.1 Add lists/labels to action registry | 1h | 🟡 High | ✅ Done |
| 2.2 Add lists/labels stores (or extend task-store) | 2h | 🟡 High | ✅ Done |
| 2.3 Update sidebar to use stores | 1h | 🟡 High | ✅ Done |

### Phase 3: Offline Indicator

| Task | Effort | Priority | Status |
|------|--------|----------|--------|
| 3.1 Create `SyncStatus.tsx` component | 1h | 🟡 High | ✅ Done |
| 3.2 Add to MainLayout | 15min | 🟡 High | ✅ Done |

### Phase 4: Conflict Resolution

| Task | Effort | Priority | Status |
|------|--------|----------|--------|
| 4.1 Add `updatedAt` to task payloads | 30min | 🟡 High | ✅ Done |
| 4.2 Handle 409 in `processQueue()` | 1h | 🟡 High | ✅ Done |
| 4.3 Create `ConflictDialog.tsx` | 2h | 🟡 High | ✅ Done |

### Phase 5: Service Worker Caching

| Task | Effort | Priority | Status |
|------|--------|----------|--------|
| 5.1 Add custom `runtimeCaching` to next.config.ts | 30min | 🟢 Medium | ✅ Done |

### Phase 6: Data Freshness

| Task | Effort | Priority | Status |
|------|--------|----------|--------|
| 6.1 Add `lastFetched` to IDB meta store | 30min | 🟢 Medium | ✅ Done |
| 6.2 Implement staleness checks in DataLoader | 1h | 🟢 Medium | ✅ Done |
| 6.3 Background refresh on focus/online | 30min | 🟢 Medium | ✅ Done |

---

## File Changes Summary

### Files to Create

| File | Description |
|------|-------------|
| `src/components/sync/SyncStatus.tsx` | Visual sync indicator | ✅ Created |
| `src/components/sync/ConflictDialog.tsx` | Conflict resolution UI | ✅ Created |
| `src/lib/store/list-store.ts` | Zustand store for lists | ✅ Created |
| `src/lib/store/label-store.ts` | Zustand store for labels | ✅ Created |

### Files to Modify (Priority Order)

| File | Changes | Status |
|------|---------|--------|
| `src/hooks/use-optimistic-tasks.ts` | Deprecated with JSDoc | ✅ Done |
| `src/components/tasks/TaskListWithSettings.tsx` | Remove `useOptimisticTasks`, read from store directly | ✅ Done |
| `src/components/tasks/TaskItem.tsx` | Make `dispatch` optional with `useSync()` fallback | ✅ Done |
| `src/lib/store/task-store.ts` | Fix `initialize()` to merge, not replace | ✅ Done |
| `src/components/providers/sync-provider.tsx` | Memoize context, fix stale closure, add conflict handling | ✅ Done |
| `src/components/providers/data-loader.tsx` | Await initialize before fetch | ✅ Done |
| `src/lib/sync/registry.ts` | Add list/label/gamification actions | ✅ Done (lists/labels) |
| `src/components/layout/MainLayout.tsx` | Add `SyncStatus` | ✅ Done |
| `next.config.ts` | Add Workbox `runtimeCaching` | ✅ Done |

---

## Estimated Effort (Revised)

| Phase | Effort | Priority | Status |
|-------|--------|----------|--------|
| Phase 1: Fix Architecture | 2-3h | 🔴 Critical | ✅ Done |
| Phase 2: Extend Optimistic | 4h | 🟡 High | ✅ Done |
| Phase 3: Offline Indicator | 1-2h | 🟡 High | ✅ Done |
| Phase 4: Conflict Resolution | 3-4h | 🟡 High | ✅ Done |
| Phase 5: SW Caching | 30min | 🟢 Medium | ✅ Done |
| Phase 6: Data Freshness | 2h | 🟢 Medium | ✅ Done |

**Total: ~2-3 days** (reduced from 6-8 days due to existing foundation)

**Progress: All phases complete** — Architecture fixed; stores for tasks/lists/labels; sync indicator; conflict resolution; SW caching; data freshness with SWR-like pattern.

---

## Open Questions / Decisions

1. **Conflict resolution granularity**: Field-level merge or whole-task replace?
2. **Max queue size**: Cap pending actions (e.g., 100) to prevent memory issues?
3. **Clear cache on logout**: Full wipe or keep for quick re-login?
4. **Should lists/labels have their own stores or extend task-store?**
