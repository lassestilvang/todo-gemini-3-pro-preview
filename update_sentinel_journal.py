import datetime
import os

today = datetime.date.today().strftime('%Y-%m-%d')
entry = f"""
## {today} - [High] TOCTOU IDOR in Google Tasks Sync Conflict Resolution
**Vulnerability:** In `src/lib/actions/google-tasks.ts`, the `resolveGoogleTasksConflict` function verified if a conflict belonged to a user via an initial `db.query.externalSyncConflicts.findFirst()` query. However, the actual state mutation (`db.update(externalSyncConflicts)`) subsequently applied the resolution relying solely on the conflict ID `eq(externalSyncConflicts.id, conflictId)` without scoping it to the `userId`. This exposes a Time-Of-Check to Time-Of-Use (TOCTOU) IDOR vulnerability where concurrent actions or bypassed upstream checks could mutate another user's sync conflicts.
**Learning:** Similar to previously discovered issues with database mutations (`DELETE` and `UPDATE`), relying on separate preceding `SELECT` statements for authorization is insufficient and creates race conditions or logic gaps. Drizzle ORM mutations must natively incorporate ownership boundaries in their `WHERE` clauses.
**Prevention:** Always enforce atomic access controls by including `userId` directly inside the `where` clause of the database mutation itself (e.g., `where: and(eq(table.id, id), eq(table.userId, userId))`). Never rely purely on an upstream `select` check to secure a downstream mutation.
"""

file_path = '.jules/sentinel.md'

if not os.path.exists(os.path.dirname(file_path)):
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

with open(file_path, 'a') as f:
    f.write(entry)

print("Journal updated successfully")
