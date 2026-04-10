## 2024-04-07 - Avoid array.map allocations during Map initialization
**Learning:** The pattern `new Map(array.map(...))` creates unnecessary intermediate arrays just to initialize a Map. In performance-sensitive code or frequent renders, this adds redundant object allocations and increases GC overhead.
**Action:** Replace `new Map(array.map(...))` with an empty Map and a `for...of` loop (`const map = new Map(); for (const item of array) { map.set(...) }`) to avoid intermediate array creation.

## 2025-02-28 - Avoid array callback methods for performance in render loops
**Learning:** Using array callback methods like `.map()` to iterate and transform data inside React render loops adds unnecessary overhead from callback allocations and executions compared to a pre-allocated traditional for-loop, especially on large datasets.
**Action:** Replaced `activeTasks.map((task) => task.id)` with a pre-allocated O(N) array initialized using a traditional C-style `for` loop in `TaskListWithSettings.tsx` to compute `activeTaskIds` faster and reduce GC overhead.

## 2025-04-09 - [Optimize] Avoid chained array allocations in Todoist sync
**Learning:** Initializing maps alongside array extractions separately causes multiple O(N) iterations. Combining map populations and array initializations within the same loop eliminates redundant traversal and GC overhead from `.map()`.
**Action:** Replaced `const localTaskIds = localTasks.map((task) => task.id);` with an inline pre-allocated array `new Array(localTasks.length)` and populated it within the existing `for (const task of localTasks)` loop in `src/lib/todoist/sync.ts`.
