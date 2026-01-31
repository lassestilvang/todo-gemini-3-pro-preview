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

## 2026-01-27 - Batch Update Optimization
**Learning:** Using `Promise.all` with individual `UPDATE` queries for reordering (O(N)) is significantly slower than a single batched `UPDATE` with `CASE WHEN` (O(1)).
**Action:** Replace sequential updates with `sql` `CASE WHEN` constructs for bulk operations like reordering.
