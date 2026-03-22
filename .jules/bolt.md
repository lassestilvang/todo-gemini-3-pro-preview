## 2025-02-21 - Batch Drizzle ORM inserts to fix N+1 in Todoist Sync

**Learning:** Performing `await db.insert(...).values(...)` inside a tight loop processing external entity arrays triggers N+1 database queries, significantly slowing down synchronization tasks and increasing database connection load.
**Action:** Replaced individual loop inserts in `src/lib/todoist/sync.ts` with an accumulator array (`externalEntityMappingsToCreate`), leveraging strict types `(typeof externalEntityMap.$inferInsert)[]`, and executed a single bulk `.values()` insertion at the end of the loop if the array contains items.

## 2025-02-21 - Batch Drizzle ORM inserts to fix N+1 in Todoist Sync

**Learning:** Performing `await db.insert(...).values(...)` inside a tight loop processing external entity arrays triggers N+1 database queries, significantly slowing down synchronization tasks and increasing database connection load.
**Action:** Replaced individual loop inserts in `src/lib/todoist/sync.ts` with an accumulator array (`externalEntityMappingsToCreate`), leveraging strict types `(typeof externalEntityMap.$inferInsert)[]`, and executed a single bulk `.values()` insertion at the end of the loop if the array contains items.
