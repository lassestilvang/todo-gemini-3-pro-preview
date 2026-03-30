## $(date +%Y-%m-%d) - Optimize array.includes in array.filter
**Learning:** Using `array.includes()` inside an array iteration like `.filter()` or `.map()` creates an $O(N*M)$ bottleneck. When dealing with arrays, this can drastically slow down processing.
**Action:** Convert the array used for `includes()` lookup into a `Set` before the iteration, and use `set.has()` to reduce the time complexity to $O(N+M)$. Benchmark shows a reduction from ~263ms to ~5ms for 10000 items with a 50% failure rate.
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

## 2025-05-18 - Optimize JSON stringification array equality check in tasks mutations
**Learning:** Using `JSON.stringify` to compare simple arrays of string/number IDs is an expensive O(N) allocation bottleneck within Server Actions, resulting in significant execution overhead when dealing with large datasets or frequent mutations.
**Action:** Replaced `JSON.stringify` array checks in `src/lib/actions/tasks/mutations.ts` with direct array length comparisons and `.every()` index value matching, yielding a 5.1x performance increase in microbenchmarks and eliminating the string allocation overhead completely.
## 2025-02-13 - Replace includes with Set in Sync Manager
**Learning:** Using `Array.includes` inside `.map()` or `.filter()` loops creates an O(N*M) time complexity bottleneck. By converting the lookup array to a `Set` before iteration and using `Set.has()`, complexity drops to O(N+M), significantly improving performance for state updates.
**Action:** Replaced `failedIds.includes()` with a `Set` in `useSyncManager.ts` for both `retryAllFailed` and `dismissAllFailed`. Benchmarked a 90x speedup for 10000 items and 1000 failed IDs.

## 2026-03-24 - Optimize Map allocation in Search Action
**Learning:** Initializing Maps using `new Map(array.map(...))` creates a redundant O(N) intermediate array allocation before the Map is actually created, causing unnecessary garbage collection overhead.
**Action:** Avoid `new Map(array.map(...))` and instead initialize an empty map (`new Map()`) and populate it directly using a `for...of` loop, significantly reducing memory footprint during tight loops.
## 2026-03-24 - Replace O(N*M) array.includes with O(N) Set.has in array iterations
**Learning:** Using `array.includes()` inside `.filter()` or `.map()` methods creates an O(N*M) time complexity bottleneck. This happens because `.includes()` iterates through the array linearly for every element processed by the outer loop.
**Action:** Replaced `.includes()` with `.has()` by precomputing a `Set` (e.g., `const lookup = new Set(ids)`) before the loop. This reduces the time complexity from O(N*M) to O(N+M) due to O(1) lookups in `Set`.
## 2026-03-24 - Optimize Todoist Sync N+1 Task Labels Insert/Delete
**Learning:** Performing `await db.delete()` and `await db.insert()` database queries repeatedly inside a `for...of` loop results in an N+1 query problem, significantly degrading sync performance when numerous task mappings are processed.
**Action:** Replaced sequential `db.delete(taskLabels)` and `db.insert(taskLabels)` calls inside the `updateRemoteTasks` loop with an accumulator array strategy. A single bulk `db.delete()` using `inArray()` and a single bulk `db.insert().values()` were executed outside the loop, correctly typing the insert payload array with `typeof table.$inferInsert`. This decreased integration test suite execution time by approximately 550ms (from ~1480ms to ~920ms).

## 2026-03-25 - Optimize Map allocation in React render loop
**Learning:** Initializing Maps using `new Map(array.map(...))` inside React's `useMemo` or render loops creates a redundant O(N) intermediate array allocation before the Map is actually created, causing unnecessary garbage collection overhead on every recomputation.
**Action:** Avoid `new Map(array.map(...))` and instead initialize an empty map (`new Map<K, V>()`) and populate it directly using a `for...of` loop to reduce memory footprint and improve rendering performance during tight loops.
\n## 2024-03-27 - Array.find() Callback Overhead in Hot Mapping Loops\n**Learning:** Using `Array.find()` inside hot nested loops (like batch synchronization algorithms resolving labels and projects) creates significant hidden overhead due to repeated function allocations and closure invocations. Even for small inner arrays, multiplying this by thousands of external tasks results in O(N*M) bottlenecks.\n**Action:** Replace `Array.find()` with `for...of` loops in high-frequency mapping/resolution functions to achieve identical logic while eliminating callback and closure overhead entirely.

## 2026-03-26 - Replace Array.reduce with for...of loop in hot loops
**Learning:** Using `Array.reduce()` with a callback function incurs hidden overhead from function allocation and closure invocation, especially when processing potentially large datasets.
**Action:** Replaced `.reduce()` with a standard `for...of` loop in `src/lib/weekly-review.ts` and `src/lib/time-export.ts`. This eliminates callback overhead and improves execution speed during simple array accumulations.
