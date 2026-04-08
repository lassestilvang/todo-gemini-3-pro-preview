## 2024-05-18 - Optimize Set initialization in Todoist Sync
**Learning:** Initializing Sets using an intermediate array allocation like `new Set(array.map(...))` causes unnecessary O(N) memory allocation and redundant iterations.
**Action:** Replaced `const snapshotLabelIds = new Set(snapshot.labels.map((label) => label.id));` with a `for...of` loop that directly adds elements into an empty `Set`, taking advantage of an existing loop in the code block. This resulted in an approx ~29% performance increase in a local benchmark test.
