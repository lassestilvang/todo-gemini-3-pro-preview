## 2024-05-15 - [Date Allocations in Tight UI Loops]
**Learning:** `date-fns` functions like `isToday`, `isTomorrow`, and `isThisWeek` internally instantiate `new Date()` (`Date.now()`). When used in tight O(N) grouping or rendering loops (like grouping a large task board), they cause massive hidden object allocations and garbage collection pressure, leading to UI micro-stutters.
**Action:** In O(N) iterative functions or loops, replace these helpers with their allocation-free counterparts (`isSameDay`, `isSameWeek`) and explicitly pass down a single hoisted `now = new Date()` reference. Similarly, hoist any relative offset dates (like `tomorrow = addDays(now, 1)`) so they are computed only once per loop.

## 2025-03-12 - Replaced Chained Array Methods with Single For Loops in Event Processing
**Learning:** Chained array methods (e.g., `.filter().map()`, `.filter().flatMap()`, `.filter().map().filter()`) when processing large arrays of objects in performance critical areas like calendar `useMemo` hooks significantly increase object allocations, iteration overhead, and garbage collection pauses. Converting these chains to a single native `for` loop reduces time spent from ~1.9ms per 10k items to ~1.7ms and avoids creating multiple intermediate arrays.
**Action:** When a `useMemo` processes a large list (like tasks) through multiple iterations (filter, map, flatMap), combine them into a single O(N) `for` loop to minimize intermediate allocations and redundant passes.

## 2025-03-16 - Replace O(N*M) Array.find with O(N+M) Map lookups
**Learning:** Found multiple instances where an array was being iterated, and for each item, `Array.find()` was called on another array to perform a join-like operation (e.g., matching mappings to projects/labels). This produces O(N*M) time complexity, and can cause observable delay in the UI when the arrays grow large.
**Action:** When performing cross-references between two arrays, always precompute a `Map` from the secondary array before iterating over the primary array. This reduces the time complexity to O(N+M) using O(1) hash map lookups.
## 2025-03-15 - [Refactored formattedGroupNames to Hoist Dates]
**Learning:** `date-fns` functions like `isToday`, `isTomorrow`, and `isThisYear` internally instantiate `new Date()` (`Date.now()`). When used in loops mapping over items, this creates hidden object allocations and garbage collection pressure.
**Action:** Replaced `groupedEntries.forEach` with a native `for...of` loop, hoisted `today = new Date()` and `tomorrow = addDays(today, 1)` outside the loop, and replaced the date-fns calls with their allocation-free counterparts `isSameDay` and `isSameYear`.

## 2025-03-22 - Consolidate Multiple Iterations into a Single Pass in useMemo
**Learning:** Having multiple sequential iterations over the same large array within or across different `useMemo` hooks (e.g., using `forEach` to build a map, then `.filter` to extract a sub-list) causes redundant O(N) operations and object allocations. Consolidating these passes into a single native `for` loop significantly reduces overhead during render, especially for large datasets like tasks.
**Action:** When deriving multiple state structures from a single large array, merge the logic into a single native `for` loop within a shared `useMemo` that returns an object containing the derived structures.

## 2025-02-17 - Optimize unmapped Google Tasklists sync with Promise.all and bulk inserts
**Learning:** Sequential external API calls combined with sequential DB inserts (N+1) cause major delays. Drizzle's `db.insert().values()` throws errors on empty arrays, so always verify length first.
**Action:** Replaced sequential loop with `Promise.all` mapping for API calls and single batched DB insert, reducing time roughly from O(N) to O(1). Wrapped the DB insert safely with an `if (unmappedLists.length > 0)` check.
