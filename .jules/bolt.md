## 2026-03-24 - Optimize Map allocation in React render loop
**Learning:** Initializing Maps using `new Map(array.map(...))` inside React's `useMemo` or render loops creates a redundant O(N) intermediate array allocation before the Map is actually created, causing unnecessary garbage collection overhead on every recomputation.
**Action:** Avoid `new Map(array.map(...))` and instead initialize an empty map (`new Map<K, V>()`) and populate it directly using a `for...of` loop to reduce memory footprint and improve rendering performance during tight loops.

## 2026-03-27 - Array.find() Callback Overhead in Hot Mapping Loops
**Learning:** Using `Array.find()` inside hot nested loops (like batch synchronization algorithms resolving labels and projects) creates significant hidden overhead due to repeated function allocations and closure invocations. Even for small inner arrays, multiplying this by thousands of external tasks results in O(N*M) bottlenecks.
**Action:** Replace `Array.find()` with `for...of` loops in high-frequency mapping/resolution functions to achieve identical logic while eliminating callback and closure overhead entirely.

## 2026-03-28 - Avoid array.map allocations during Map initialization
**Learning:** The pattern `new Map(array.map(...))` or `new Map(array.filter(...).map(...))` creates unnecessary intermediate arrays just to initialize a Map. In performance-sensitive code (like Google Tasks sync processing), this adds redundant object allocations and increases GC overhead.
**Action:** Replace `new Map(array.map(...))` with `const map = new Map(); for (const item of array) { map.set(...) }` to avoid intermediate array creation.

## 2024-03-26 - Replace Array.reduce with for...of loop in hot loops
**Learning:** Using `Array.reduce()` with a callback function incurs hidden overhead from function allocation and closure invocation, especially when processing potentially large datasets.
**Action:** Replaced `.reduce()` with a standard `for...of` loop in `src/lib/weekly-review.ts` and `src/lib/time-export.ts`. This eliminates callback overhead and improves execution speed during simple array accumulations.

## 2025-04-01 - Avoid Array.filter().map() chaining overhead
**Learning:** Using `array.filter(...).map(...)` in state update functions (like queue processing in useSyncManager) forces two separate O(N) iterations over the array and creates an intermediate allocated array that is immediately thrown away, increasing garbage collection pressure.
**Action:** Replace `.filter().map()` chains with a single `for...of` loop that directly pushes to an accumulator array when the condition is met. This reduces time complexity from 2N to N and eliminates the intermediate array allocation.
