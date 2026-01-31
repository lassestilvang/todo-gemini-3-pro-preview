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
