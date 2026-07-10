## 2024-05-31 - [Array Allocation in useMemo]
**Learning:** Precomputing a dynamically mapped array (using `Array.map`) inside a `useMemo` hook does not prevent array re-allocation on every render if the dependency array relies on referential equality and is unstable (e.g. source arrays that might be re-created). The mapping operation allocates intermediate arrays which are collected by the garbage collector, slightly degrading performance.
**Action:** Replace `Array.map` with a pre-allocated array (`new Array(length)`) and populate it directly using a standard `for` loop inside critical `useMemo` hooks (e.g., `daysWithMeta` in calendar components) to minimize memory allocation and garbage collection overhead.
## 2024-05-31 - [Array Allocation in useMemo]
**Learning:** When building an array from an existing collection (e.g., generating select options or filters), using the spread operator with `.map()` (e.g., `[defaultItem, ...items.map(...)]`) creates intermediate arrays and spread overhead.
**Action:** Replace spread with `.map()` with a pre-allocated array to its exact final size (e.g., `new Array(items.length + 1)`) and populate it directly using a standard `for` loop to minimize memory allocation and garbage collection overhead, especially in frequently re-rendered components.
## 2024-06-03 - [Array Classification Performance]
**Learning:** When extracting multiple distinct subsets from the same source array (e.g., mapping Todoist sync entity mappings into `projectMappings`, `listLabelMappings`, `labelMappings`, and `taskMappings`), using consecutive `.filter()` calls iterates the array multiple times (O(k*N)).
**Action:** Replace multiple `.filter()` calls on the same array with a single-pass `for...of` loop with `if/else` checks to classify elements. This reduces iterations to O(N) and minimizes intermediate array allocation overhead.

## 2024-06-06 - [Promise.all Concurrency]
**Learning:** Sequential `Promise.all` awaits on mapped arrays that use limits like `pLimit` iterate over the array inline and allocate intermediate Promises in sequence, causing O(N) operations inside async boundaries.
**Action:** Replace `Promise.all(array.map(...))` with pre-allocated arrays and indexed loops before passing to `Promise.all` when using concurrency limiters to ensure memory is allocated effectively.
## 2024-06-08 - [Array Iteration in useMemo]
**Learning:** Re-evaluating array transformations like `Array.from().filter()` and `Array.find()` inside `useMemo` hooks allocates intermediate arrays and iterators, causing unnecessary garbage collection pressure when executed on every render cycle.
**Action:** Replace `Array.from().filter()` and `Array.find()` with direct standard `for...of` or `for` loops inside frequently executing `useMemo` hooks (such as calendar rendering filters) to perform transformations with zero intermediate memory allocation.

## 2026-06-09 - Optimize Object Mapping in useMemo
**Learning:** Using `Object.values().forEach()` inside frequently evaluated `useMemo` hooks (like computing task counts from a global store) creates expensive O(N) intermediate array allocations and closure overheads that trigger aggressive garbage collection and degrade performance.
**Action:** Replaced `Object.values().forEach()` with a raw `for...in` loop directly on the object dictionary, and swapped nested `forEach` array iterations with standard indexed `for` loops to completely eliminate memory allocation and closure execution costs.

## 2025-06-17 - Optimize Object Emptiness Check in useMemo
**Learning:** Relying on `Object.keys(obj).length === 0` to check for object emptiness inside frequently rendered hooks (like `useMemo` or `useEffect`) needlessly allocates an intermediate O(N) array on every evaluation. `Object.values(obj).length > 0` suffers the same issue.
**Action:** Replace these checks with a fast, allocation-free `for...in` loop that breaks immediately after the first key (e.g., extracted as an `isObjectEmpty(obj)` utility) to reduce memory allocations and garbage collection overhead during renders.
## 2025-06-25 - [React Reference Preservation in useMemo]
**Learning:** When conditionally appending items to an array inside a `useMemo` block (e.g., `[...activeTasks, ...(showCompleted ? completedTasks : [])]`), unconditionally returning a newly allocated array or combination (even if the second array is empty) breaks referential equality for the primary array. This can cause unnecessary downstream re-renders.
**Action:** Use an early return to pass back the original array reference (`if (!showCompleted || completedTasks.length === 0) return activeTasks;`) when no items need to be appended. For the combination, `array.concat()` or a spread operator is sufficient as long as the default state preserves the reference.
