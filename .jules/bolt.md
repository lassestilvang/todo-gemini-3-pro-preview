## 2025-02-14 - Optimize label mapping creation in Todoist sync
**Learning:** The Todoist sync process exhibited an N+1 query issue when saving newly created remote labels back to the database (`db.insert(externalEntityMap).values(...)` within a loop).
**Action:** Replaced the loop's individual inserts with an array of mapping objects (`labelMappingsToCreate`) and a single batch insert at the end of the operation, significantly reducing database roundtrips and execution time.
