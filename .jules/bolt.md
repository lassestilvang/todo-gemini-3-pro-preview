## 2025-12-31 - Bun Lockfile Churn
**Learning:** Running `bun install` to ensure dependencies are present can implicitly upgrade/pin all dependencies in `bun.lock` if not careful, leading to massive unrelated changes in PRs.
**Action:** After running `bun install` or similar commands, always verify `bun.lock` status and revert if it contains unintended changes, especially when no package versions were explicitly changed in `package.json`.

## 2026-01-26 - Sequential Database Queries
**Learning:** Fetching related data (labels, reminders, subtasks) sequentially in server actions multiplies database latency by the number of relations.
**Action:** Use `Promise.all` to fetch independent relations in parallel once the parent entity is retrieved.

## 2026-01-26 - Batched Dependency Resolution
**Learning:** Iterating through blocked tasks to check their status individually causes N+1 queries. Using `inArray` and `groupBy` allows checking all blocked tasks in a single query.

## 2026-01-26 - Consolidated User Stats Updates
**Learning:** Updating related entities (streak, XP, stats) in separate server actions causes unnecessary DB roundtrips. Consolidating logic into a single transactional update reduced operations by 50% for task completion.
**Action:** Identify related state updates and implement "consolidated update" helpers that perform all calculations and writes in a single pass.

## 2026-01-26 - Deduplicated Prefetching
**Learning:** Prefetching data (on hover) and then fetching it again (on click) without caching the Promise causes race conditions and double requests.
**Action:** Store the `Promise` in a `useRef` when prefetching, and `await` that same promise when consumption is needed.

## 2026-01-26 - CommandDialog Performance Props
**Learning:** `shadcn/ui` wrapper components like `CommandDialog` often swallow props needed for performance tuning (like `shouldFilter={false}` for `cmdk`).
**Action:** Extend wrapper components to accept a `commandProps` or similar object to pass through configuration to the underlying primitive, rather than reimplementing the whole wrapper.

## 2026-01-27 - Correlated Subqueries
**Learning:** Using correlated subqueries (e.g., `(SELECT COUNT(*) ... WHERE outer.id = inner.id)`) in main `SELECT` statements scales poorly (O(N)) for large datasets.
**Action:** Replace correlated subqueries with a separate parallel query using `GROUP BY` and merge the results in memory using a Map.

## 2026-01-31 - Redundant Array Filtering in Render
**Learning:** Filtering the same array multiple times in a component's render function (e.g., `pendingActions.filter(a => a.status === 'pending')` and `pendingActions.filter(a => a.status === 'failed')`) causes redundant O(n) iterations on every render.
**Action:** Use `useMemo` with a single loop to compute all derived counts at once, reducing O(2n) to O(n) and preventing recalculation when dependencies haven't changed.

## 2026-01-31 - Date Object Allocation in Filter Loops
**Learning:** Creating `new Date()` objects inside filter loops (e.g., `new Date(task.dueDate).getTime()` for each task) causes unnecessary allocations. For 1k tasks, this creates 1k+ Date objects per render.
**Action:** Pre-compute timestamps outside the loop and use `.getTime()` directly on Date properties. Since `task.dueDate` is already a Date object, call `.getTime()` on it directly instead of wrapping in `new Date()`.

## 2026-01-31 - Array.find() in Render Loops
**Learning:** Using `Array.find()` inside a render loop creates O(n*m) complexity. For a heatmap with 140 days and 100 data points, this results in 14,000 array iterations per render.
**Action:** Build a Map from the data array once using `useMemo`, then use O(1) Map lookups instead of O(n) Array.find() calls. This reduces complexity from O(n*m) to O(n+m).


## 2026-01-31 - XPBar Aggressive Polling
**Learning:** The XPBar component was polling user stats every 2 seconds, causing 30 database queries per minute per user. Since XP updates are triggered by task completion (which invalidates the React Query cache), aggressive polling is unnecessary except for multi-tab sync scenarios.
**Action:** Reduce polling intervals to 10-30 seconds for stats that update infrequently. Rely on cache invalidation from mutations as the primary update mechanism, using polling only as a fallback for edge cases.

## 2026-01-31 - Expensive Chart Data Transformations
**Learning:** The AnalyticsCharts component was recalculating chart data arrays and finding max values on every render. Using `Math.max(...array)` spreads the array into function arguments, creating unnecessary intermediate copies. For analytics pages with multiple charts, this caused redundant array operations on every parent state change.
**Action:** Wrap chart data transformations in `useMemo` with proper dependencies. Replace `Math.max(...array)` with a simple for-loop to find max values in a single pass without array spreading, reducing both memory allocations and computational overhead.

## 2026-01-31 - Date Comparison Allocations in TaskItem
**Learning:** TaskItem was creating new Date objects from `task.dueDate` and `task.deadline` for every comparison check (`new Date(task.dueDate) < now`). Since `task.dueDate` and `task.deadline` are already Date objects in the Task type, wrapping them in `new Date()` is redundant. For 100 tasks rendered, this created 200+ unnecessary Date allocations per render.
**Action:** Use `.getTime()` directly on Date properties for timestamp comparisons. Pre-compute `nowTime` once and compare timestamps instead of Date objects, eliminating redundant allocations while maintaining exact comparison semantics.

## 2026-01-31 - Status Info Object Allocations in SyncStatus
**Learning:** The SyncStatus component was calling `getStatusInfo()` on every render, creating new objects with icon, label, description, and className properties each time. Since this component updates frequently during sync operations (status changes, pending count updates), these allocations added unnecessary GC pressure and could trigger re-renders in child components.
**Action:** Wrap the status info object creation in `useMemo` with proper dependencies (isOnline, failedCount, status, pendingCount). This ensures the object reference remains stable when dependencies haven't changed, reducing allocations and preventing unnecessary re-renders of components that consume these values.

## 2026-01-31 - Reduce with Spread Operator O(n²) Complexity
**Learning:** Using `.reduce((acc, item) => ({ ...acc, [item.id]: value }), {})` to build an object from an array creates O(n²) complexity because the spread operator copies all existing properties on each iteration. For a task with 50 subtasks, this creates 1,225 intermediate objects (50*49/2). The TaskItem component was using this pattern to initialize subtask completion states.
**Action:** Replace reduce-with-spread with a simple for-loop that mutates a single object: `const obj = {}; for (const item of array) { obj[item.id] = value; }`. This is O(n) and creates only one object, eliminating thousands of allocations for tasks with many subtasks.

## 2026-02-01 - React.memo for Analytics Components
**Learning:** Analytics components (AnalyticsCharts, CompletionHeatmap) render expensive chart visualizations with recharts. Without React.memo, these components re-render whenever the parent analytics page updates any state (filters, tabs, etc.), even when their data prop hasn't changed. Since these components already use useMemo for internal calculations, adding React.memo prevents the entire component tree from re-rendering unnecessarily.

## 2026-02-01 - Missing Composite Indexes
**Learning:** High-traffic aggregation queries (e.g., "Daily Completed Task Count" for streaks) and default list views often lack covering indexes, leading to full table scans or expensive sort operations as data grows.
**Action:** Identify the most frequent access patterns (aggregations, default sorts) and add specific composite indexes (e.g., `(userId, isCompleted, completedAt)` for stats) to enable Index Only Scans.

## 2026-02-01 - Global Stats Caching Strategy
**Learning:** Global user stats (XP, streaks) were managed via React Query in `XPBar` with a long polling interval (5 min). Immediate updates are triggered by invalidating the `['userStats', userId]` query key within `SyncProvider`'s `processQueue` after successful task completion actions.
**Action:** When handling global data that changes based on specific user actions, prefer explicit cache invalidation (via `queryClient.invalidateQueries`) over aggressive polling. This reduces idle database load to near zero while ensuring immediate UI updates.
