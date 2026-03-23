## 2025-05-18 - Hoist O(N) allocations in Calendar Rendering
**Learning:** Date-fns `startOfDay` creates a new Date instance and adds abstraction overhead. Inside O(N) rendering maps like `daysWithMeta` (which loops up to 42 times for calendar cells) and `tasksByDate` (looping over every task), using `startOfDay(date)` causes significant hidden garbage collection overhead.
**Action:** Hoist the threshold calculations and manually calculate `new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()` to avoid invoking `startOfDay` and triggering redundant internal Date instantiations within loops.
## 2025-02-21 - Batch Drizzle ORM inserts to fix N+1 in Todoist Sync
## 2025-02-14 - Optimize label mapping creation in Todoist sync
**Learning:** The Todoist sync process exhibited an N+1 query issue when saving newly created remote labels back to the database (`db.insert(externalEntityMap).values(...)` within a loop).
**Action:** Replaced the loop's individual inserts with an array of mapping objects (`labelMappingsToCreate`) and a single batch insert at the end of the operation, significantly reducing database roundtrips and execution time.
## 2024-05-18 - Replace O(N*M) Array.find with O(1) Map lookups in Todoist Sync
**Learning:** Found multiple instances in `src/lib/todoist/sync.ts` where `mappingState.labels.find()` and `mappingState.projects.some()` were called inside loops iterating over tasks, resulting in O(N*M) time complexity during sync, which can severely impact performance for users with many mapped labels and tasks.
**Action:** Precomputed `mappedListIds: Set<number>` and `listLabelMappingMap: Map<number, string>` before the O(N) loops. This reduced the time complexity to O(N+M) using O(1) Map/Set lookups inside `hasLocalListMapping` and `buildLocalTaskPayload`.

**Learning:** Performing `await db.insert(...).values(...)` inside a tight loop processing external entity arrays triggers N+1 database queries, significantly slowing down synchronization tasks and increasing database connection load.
**Action:** Replaced individual loop inserts in `src/lib/todoist/sync.ts` with an accumulator array (`externalEntityMappingsToCreate`), leveraging strict types `(typeof externalEntityMap.$inferInsert)[]`, and executed a single bulk `.values()` insertion at the end of the loop if the array contains items.

## 2025-02-21 - Batch Drizzle ORM inserts to fix N+1 in Todoist Sync

**Learning:** Performing `await db.insert(...).values(...)` inside a tight loop processing external entity arrays triggers N+1 database queries, significantly slowing down synchronization tasks and increasing database connection load.
**Action:** Replaced individual loop inserts in `src/lib/todoist/sync.ts` with an accumulator array (`externalEntityMappingsToCreate`), leveraging strict types `(typeof externalEntityMap.$inferInsert)[]`, and executed a single bulk `.values()` insertion at the end of the loop if the array contains items.

## 2025-02-21 - Batch Drizzle ORM inserts to fix N+1 in Todoist Sync

**Learning:** Performing `await db.insert(...).values(...)` inside a tight loop processing external entity arrays triggers N+1 database queries, significantly slowing down synchronization tasks and increasing database connection load.
**Action:** Replaced individual loop inserts in `src/lib/todoist/sync.ts` with an accumulator array (`externalEntityMappingsToCreate`), leveraging strict types `(typeof externalEntityMap.$inferInsert)[]`, and executed a single bulk `.values()` insertion at the end of the loop if the array contains items.

## 2025-02-21 - Batch Drizzle ORM inserts to fix N+1 in Todoist Sync

**Learning:** Performing `await db.insert(...).values(...)` inside a tight loop processing external entity arrays triggers N+1 database queries, significantly slowing down synchronization tasks and increasing database connection load.
**Action:** Replaced individual loop inserts in `src/lib/todoist/sync.ts` with an accumulator array (`externalEntityMappingsToCreate`), leveraging strict types `(typeof externalEntityMap.$inferInsert)[]`, and executed a single bulk `.values()` insertion at the end of the loop if the array contains items.
## 2025-02-17 - Optimize unmapped Google Tasklists sync with Promise.all and bulk inserts
**Learning:** Sequential external API calls combined with sequential DB inserts (N+1) cause major delays. Drizzle's `db.insert().values()` throws errors on empty arrays, so always verify length first.
**Action:** Replaced a sequential loop of API calls and DB inserts with concurrent API calls via `Promise.all` and a single batched DB insert. This significantly reduces wall-clock time by parallelizing network requests and batching database writes. Wrapped the DB insert safely with an `if (unmappedLists.length > 0)` check.

## 2025-02-14 - Optimize redundant JSON stringification in sync manager payload processing
**Learning:** Structural sharing is crucial for fast comparisons in React state and general synchronization managers. If an update helper like `replaceIdsInPayload` always returns a new object even when no replacements occur, callers are forced to use expensive `JSON.stringify` comparisons to check if changes actually occurred.
**Action:** Optimized `replaceIdsInPayload` to return original object/array references if no IDs are mutated during recursion. In `useSyncManager.ts`, the costly `JSON.stringify` checks inside the sync loop were completely eliminated and replaced with simple `newPayload !== action.payload` reference checks. This resulted in significant performance gains for payload processing during sync lock handling.
## 2025-03-22 - Avoid Array.includes inside map/filter state updaters
**Learning:** Calling `array.includes(id)` inside an `array.map()` or `array.filter()` loop (e.g., when updating React state with a subset of modified items) results in O(N*M) time complexity, which causes performance regressions when both lists grow. Additionally, using dynamic property checks (`a.status === 'failed'`) in the state updater instead of fixed IDs can introduce race conditions if the updater is called after an `await`, as new items might have failed in the background.
**Action:** Convert the subset array of IDs to a `Set` before the loop, and use `set.has(item.id)` inside the map/filter. This safely captures the exact snapshot of IDs that were just processed while reducing the complexity to O(N).
## 2023-10-24 - Optimize Calendar Rendering by Eliminating Redundant Checks
**Learning:** Checking for an event's valid due date multiple times introduces unnecessary overhead from object allocations and redundant function calls, especially when parsing string dates. A micro-benchmark showed that eliminating the redundant `getTaskDueDate()` call, which shares its implementation with `taskToEvent()`, avoids double-parsing date strings. Additionally, replacing the indexed `for` loop with a modern `for...of` loop improves code clarity.
**Action:** Replaced `for (let i = 0; ...)` loop with a simpler `for...of` loop, and removed the redundant `getTaskDueDate(task)` check in `src/components/calendar3/Calendar3Main.tsx` to rely strictly on the `null` return from `taskToEvent()`, reducing execution time overhead.
## 2025-02-17 - Optimize SyncManager retry/dismiss with Sets
**Learning:** Found O(N^2) anti-pattern in `useSyncManager.ts` where `.filter` or `.map` arrays call `.includes()` on another mapped array of IDs.
**Action:** Replaced `.includes()` with `new Set(ids)` and `.has()`, changing time complexity from O(N*M) to O(N+M) and yielding >100x speedup in local microbenchmarks for n=10,000 arrays.

## 2025-02-13 - Replace includes with Set in Sync Manager
**Learning:** Using `Array.includes` inside `.map()` or `.filter()` loops creates an O(N*M) time complexity bottleneck. By converting the lookup array to a `Set` before iteration and using `Set.has()`, complexity drops to O(N+M), significantly improving performance for state updates.
**Action:** Replaced `failedIds.includes()` with a `Set` in `useSyncManager.ts` for both `retryAllFailed` and `dismissAllFailed`. Benchmarked a 90x speedup for 10000 items and 1000 failed IDs.
