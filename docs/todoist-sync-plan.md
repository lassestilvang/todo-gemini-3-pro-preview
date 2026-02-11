# Todoist Sync Plan

## Goals

- Add 2-way sync between Todo Gemini and Todoist using the Todoist API v1.
- Support a maximum of 5 Todoist Projects. Additional lists in Todo Gemini map to Todoist labels.
- Preserve offline-first behavior and avoid breaking existing local workflows.
- Provide a clear opt-in setup flow with safe, auditable sync operations.

## Assumptions

- Each Todo Gemini user can connect a single Todoist account.
- Conflicts require explicit user resolution before changes apply.
- We will use Todoist “Tasks” API endpoints plus “Projects” and “Labels.”
- We will use Todoist IDs as external IDs and keep an internal mapping table for every synced entity.
- Todoist API tokens are stored encrypted at rest.

## Phased Implementation Plan

### Phase 1: Discovery and Requirements

1. Read Todoist API v1 docs for:
   - Auth (OAuth or Personal API token)
   - Projects
   - Labels
   - Tasks
   - Sync semantics and rate limits
2. Decide auth approach:
   - Personal API token (explicit user-provided token).
3. Define syncing behaviors:
   - How to detect changes (polling + sync token if available).
   - How to surface conflicts for user resolution.
   - How to handle deletions.
4. Determine field mappings:
   - Task title, description, due date/time, priority, labels, project/list, completion status, parent/subtask, recurrence.

### Phase 2: Data Model and Schema

Add new sync-related tables and columns:

1. `external_integrations` (new table)
   - `id`, `userId`, `provider` (enum: `todoist`), `accessToken`, `refreshToken`, `scopes`, `expiresAt`, `metadata`, `createdAt`, `updatedAt`.
2. `external_sync_state` (new table)
   - `id`, `userId`, `provider`, `syncToken`, `lastSyncedAt`, `status`, `error`.
3. `external_entity_map` (new table)
   - `id`, `userId`, `provider`, `entityType` (`task`, `list`, `label`), `localId`, `externalId`, `externalParentId`, `deletedAt`, `createdAt`, `updatedAt`.
4. Extend existing entities if needed:
   - `tasks.todoistSectionId?` if sections are later supported.
   - `lists.isSynced`, `labels.isSynced` (optional for UI indicators).

Also add SQLite schema updates in `src/db/schema-sqlite.ts` to keep tests passing.

### Phase 3: API Client and Integration Layer

1. Create a Todoist client wrapper:
   - `src/lib/todoist/client.ts`
   - Support `getProjects`, `getLabels`, `getTasks`, `createTask`, `updateTask`, `deleteTask`, `closeTask`, `reopenTask`.
   - Handle pagination, retries, and rate limits.
2. Add an integration service:
   - `src/lib/todoist/service.ts`
   - Contains mapping helpers and conversion functions between Todoist and Todo Gemini.

### Phase 4: Sync Engine

1. Add a sync orchestrator:
   - `src/lib/todoist/sync.ts`
   - Responsibilities:
     - fetch remote changes
     - compare with local updates
     - resolve conflicts
     - enqueue updates for local DB and Todoist API
2. Choose sync approach:
   - Polling with `sync_token` when supported by API.
   - Schedule periodic background sync on server action or cron (Vercel cron).
   - Also trigger on user actions (task/list changes).
3. Conflict resolution rules:
   - Use a `lastModifiedAt` comparison (local vs remote)
   - If local and remote changed since last sync, create a conflict record and pause syncing for that entity until user resolves it.
   - Log conflicts in Activity Log and show user warnings.
4. Deletion rules:
   - Soft-delete locally and keep tombstones for mapping.
   - Ensure deletes propagate both directions.

### Phase 5: Mapping Logic (5 Project Limit)

1. Project mapping:
   - Todoist already has 5 projects and no new ones should be created.
   - Sync those 5 projects into Todo Gemini and map lists to them.
   - Persist mappings in `external_entity_map`.
2. Label mapping for extra lists:
   - If list count exceeds 5, map additional lists to Todoist labels.
   - When pushing tasks for those lists, apply label instead of project.
   - When pulling tasks with that label, map to corresponding local list.
3. UI for selecting which 5 lists become projects:
   - Settings screen with a “Todoist Sync” section.
   - Display the 5 Todoist projects and allow mapping to local lists.
   - Allow user to reassign which local list maps to which project.

### Phase 6: UI and Settings

1. Settings UI:
   - Connect / Disconnect Todoist
   - Show sync status
   - “Sync now” button
   - Choose project mappings
   - Conflict resolution queue
2. Task UI indicators:
   - Optional icon on task to show it is synced.
3. Activity Log entries:
   - “Synced task to Todoist”
   - “Conflict resolved: Todoist vs local”

### Phase 7: Server Actions and Hooks

1. Add server actions in `src/lib/actions/todoist.ts`:
   - `connectTodoist`, `disconnectTodoist`, `syncTodoistNow`
   - `setTodoistMappings`
   - `resolveTodoistConflict`
2. Hook into existing task/list actions:
   - On task create/update/delete: enqueue Todoist sync.
   - On list create/rename/delete: update mapping.

### Phase 8: Tests

1. Unit tests for mapping and conflict resolution.
2. Integration tests using mock Todoist API.
3. Ensure schema tests work in SQLite.

### Phase 9: Observability and Reliability

1. Add telemetry for sync success/failure.
2. Store errors in `external_sync_state` and show them in UI.
3. Add retry with exponential backoff.

## Detailed Field Mapping

### Tasks

| Todo Gemini | Todoist |
| --- | --- |
| `title` | `content` |
| `description` | `description` |
| `dueDate` / `dueTime` | `due` |
| `priority` | `priority` (1-4) |
| `completed` | `is_completed` |
| `labels` | `labels` |
| `listId` | `project_id` or `label` (for extra lists) |
| `parentId` | `parent_id` |

### Lists

| Todo Gemini | Todoist |
| --- | --- |
| List | Project or Label |

## Open Questions

- None at the moment.

## Proposed File/Module Additions

- `src/lib/todoist/client.ts`
- `src/lib/todoist/service.ts`
- `src/lib/todoist/sync.ts`
- `src/lib/actions/todoist.ts`
- `src/components/settings/TodoistSettings.tsx`
- `src/db/schema.ts` + `src/db/schema-sqlite.ts`
- `docs/todoist-sync-plan.md`

## Milestones

1. Schema + mapping tables (in progress)
2. Todoist client and service layer (in progress)
3. Basic 1-way sync (local → Todoist)
4. 2-way sync with conflict resolution
5. UI settings and project/label mapping
6. Tests + monitoring

## Progress Log

- 2026-02-11: Added external integration/sync schema tables (Postgres + SQLite) for Todoist token storage, sync state, entity mapping, and conflict tracking.
- 2026-02-11: Added initial Todoist REST client and service helpers (types, snapshot fetch, priority mapping).
