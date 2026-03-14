## 2024-05-15 - [Date Allocations in Tight UI Loops]
**Learning:** `date-fns` functions like `isToday`, `isTomorrow`, and `isThisWeek` internally instantiate `new Date()` (`Date.now()`). When used in tight O(N) grouping or rendering loops (like grouping a large task board), they cause massive hidden object allocations and garbage collection pressure, leading to UI micro-stutters.
**Action:** In O(N) iterative functions or loops, replace these helpers with their allocation-free counterparts (`isSameDay`, `isSameWeek`) and explicitly pass down a single hoisted `now = new Date()` reference. Similarly, hoist any relative offset dates (like `tomorrow = addDays(now, 1)`) so they are computed only once per loop.

## 2025-03-12 - Replaced Chained Array Methods with Single For Loops in Event Processing
**Learning:** Chained array methods (e.g., `.filter().map()`, `.filter().flatMap()`, `.filter().map().filter()`) when processing large arrays of objects in performance critical areas like calendar `useMemo` hooks significantly increase object allocations, iteration overhead, and garbage collection pauses. Converting these chains to a single native `for` loop reduces time spent from ~1.9ms per 10k items to ~1.7ms and avoids creating multiple intermediate arrays.
**Action:** When a `useMemo` processes a large list (like tasks) through multiple iterations (filter, map, flatMap), combine them into a single O(N) `for` loop to minimize intermediate allocations and redundant passes.

## 2025-03-12 - Consolidated Redundant useMemo Hooks in Calendar Render
**Learning:** Having multiple `useMemo` hooks that iterate over the exact same large array (e.g., `tasks`) with identical dependency arrays causes unnecessary redundant passes through the dataset. Even simple `.filter()` or `.forEach()` operations in separate hooks add up and contribute to main-thread blocking during re-renders.
**Action:** Consolidate redundant hooks that process the same collection into a single O(N) pass (like a `for` loop) that outputs all necessary derived state objects at once (e.g., returning `{ mappedResult, filteredResult }`), cutting iteration overhead and object allocation by half.
