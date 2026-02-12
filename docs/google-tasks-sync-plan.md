# Google Tasks Sync Plan

## Goals

- Add 2-way sync between Todo Gemini and Google Tasks using the Tasks API.
- Keep the sync model consistent with the existing Todoist integration.
- Preserve offline-first behavior and avoid breaking current local workflows.
- Provide an opt-in setup flow with clear visibility into sync status and conflicts.

## Progress Log

### 2026-02-12

- Completed: Phase 2 data model updates in PostgreSQL + SQLite schemas (provider enums extended, external_etag/external_updated_at added).
- Completed: Phase 3 client + types + service modules for Google Tasks API requests and token refresh.
- Completed: Phase 4 mapping helpers for task conversions and conflict payload formatting.
- Completed: Phase 5 sync engine (full + incremental sync, conflict detection, list/task mapping persistence).
- Completed: Phase 6 server actions for sync, status, disconnect, and conflict resolution.
- Completed: Phase 7 settings UI for connect/sync/disconnect and conflict resolution.
- Completed: Background sync API route mirroring Todoist cron flow.
- Completed: Unit tests for Google Tasks mapping + conflict UI helpers.
- Completed: Google Tasks list mapping actions and settings UI for user-controlled tasklist selection.
- Completed: Conflict resolution now re-fetches the latest remote task payload before applying updates.
- Completed: Sync tasklist handling now honors user mappings and skips auto-creating remote lists when mappings exist.
- Deviations:
  - Stored `refreshTokenKeyId` in `external_integrations.metadata` JSON because schema lacks a dedicated refresh token key ID column.
  - List mappings are now user-controlled, so auto-creation of remote tasklists is skipped when mappings are present.
- Technical Decisions:
  - OAuth PKCE flow via `/api/google-tasks/auth/start` + `/api/google-tasks/auth/callback`, with state + verifier cookies.
  - Use `updatedMin = lastSyncedAt` for incremental pulls; `external_updated_at` saved per mapping for conflict awareness.
  - Labels remain local-only; list mapping is 1:1 tasklist mapping.
  - Conflict resolution re-fetches the latest remote payload to avoid applying stale data.
- API Integration Details:
  - OAuth endpoints: `https://accounts.google.com/o/oauth2/v2/auth`, `https://oauth2.googleapis.com/token`.
  - Tasks API base: `https://tasks.googleapis.com/tasks/v1`.
  - Scopes: `https://www.googleapis.com/auth/tasks`.
  - List calls: `tasklists.list`, `tasks.list` with `showCompleted`, `showDeleted`, `showHidden`, `updatedMin`.
- Error Handling:
  - API failures surface through `external_sync_state.error`.
  - OAuth errors redirect back to `/settings` with status query params.
  - Conflict detection yields `external_sync_conflicts` rows to prevent silent overwrites.
- Performance Optimizations:
  - Incremental sync via `updatedMin`.
  - Batch list/task map lookups in memory to reduce DB round-trips.
  - Skips local-to-remote pushes when no changes since last sync.
- Testing Procedures:
  - Completed: `bun lint`, `bun test`, `bun --env-file=.env.local run db:push`, `bun run build`.
  - Completed: `src/lib/google-tasks/mapper.test.ts` and `src/lib/google-tasks/conflict-ui.test.ts`.

## API Summary

- Service endpoint: https://tasks.googleapis.com
- Discovery document: https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest
- Resources:
  - `tasklists` (list, get, insert, update, patch, delete)
  - `tasks` (list, get, insert, update, patch, delete, move, clear)

## Assumptions

- Each Todo Gemini user can connect a single Google account for Tasks.
- Auth uses OAuth 2.0 with offline access (refresh token).
- Sync uses incremental updates via `updatedMin`, with full sync as fallback.
- Google Tasks supports tasklists and tasks, but no native labels.

## Phase 1: Discovery and Requirements

1. Confirm OAuth requirements:
   - Scope: `https://www.googleapis.com/auth/tasks`
   - Offline access to obtain refresh token
   - PKCE for browser-based flows
2. Confirm API behavior:
   - `tasklists.list` and `tasks.list` pagination (`pageToken`)
   - `tasks.list` supports `showCompleted`, `showDeleted`, `updatedMin`
   - Task `status`, `completed`, `due`, `updated`, `parent`, `position`, `notes`, `recurrence`
3. Define sync expectations:
   - Initial import creates local lists and tasks
   - Incremental sync uses `updatedMin` and stored timestamps
   - Deletions propagate both directions
   - Conflicts pause sync until user resolution

## Phase 2: Data Model Updates

Leverage the existing external sync tables and extend provider support.

1. Update provider enums to include `google_tasks`:
   - `external_integrations.provider`
   - `external_sync_state.provider`
   - `external_entity_map.provider`
   - `external_sync_conflicts.provider`
2. Add Google Tasks metadata to enable safe incremental sync:
   - `external_entity_map.external_etag` (string, nullable)
   - `external_entity_map.external_updated_at` (timestamp, nullable)
   - `external_sync_state.sync_token` remains null for Google Tasks, but `last_synced_at` is used for `updatedMin`
3. Update SQLite schema for tests and add migration files.

## Phase 3: Client and Integration Layer

Create a Google Tasks client wrapper consistent with the Todoist client patterns.

1. `src/lib/google-tasks/client.ts`
   - `getTasklists`, `getTasks`, `createTasklist`, `updateTasklist`, `deleteTasklist`
   - `createTask`, `updateTask`, `deleteTask`, `moveTask`, `clearCompleted`
   - Handle pagination, retries, and rate limits
2. `src/lib/google-tasks/types.ts`
   - Define Tasklist and Task types aligned with API responses
3. `src/lib/google-tasks/service.ts`
   - Token refresh handling and client creation
   - `fetchGoogleTasksSnapshot` for initial sync

## Phase 4: Mapping Rules

### Lists

- Todo Gemini lists map 1:1 to Google tasklists.
- Store mapping in `external_entity_map` (`entityType = list`).
- New Google tasklists create local lists; new local lists create Google tasklists.

### Tasks

| Todo Gemini | Google Tasks |
| --- | --- |
| `title` | `title` |
| `description` | `notes` |
| `dueDate` / `dueTime` | `due` |
| `completedAt` | `completed` |
| `isCompleted` | `status` (`completed` / `needsAction`) |
| `parentId` | `parent` |
| `position` | `position` |
| `recurringRule` | `recurrence` |

Notes:
- Google Tasks has no labels; labels remain local-only.
- Preserve `updated` and `etag` values in `external_entity_map` for conflict checks.

## Phase 5: Sync Engine

1. `src/lib/google-tasks/sync.ts`
   - Orchestrate full and incremental sync
   - Detect conflicts via `updated` timestamps and `etag` comparisons
   - Use `external_sync_conflicts` for unresolved changes
2. Initial sync:
   - Fetch all tasklists, then tasks per tasklist (`showCompleted=true`, `showDeleted=true`)
   - Create missing local lists and tasks
   - Record mappings, `external_updated_at`, and `external_etag`
3. Incremental sync:
   - Use `updatedMin = lastSyncedAt` per user
   - Pull remote updates, deletions, and completions
   - Push local changes since last sync
4. Conflict handling:
   - If local `updatedAt` > last sync and remote `updated` > last sync, create conflict
   - Allow user to resolve via “keep local” or “use Google”
5. Deletions:
   - Local delete → `tasks.delete` or `tasklists.delete`
   - Remote delete → remove local row and mapping

## Phase 6: Server Actions and Hooks

1. `src/lib/actions/google-tasks.ts`
   - `connectGoogleTasks`, `disconnectGoogleTasks`, `syncGoogleTasksNow`
   - `rotateGoogleTasksTokens`, `resolveGoogleTasksConflict`
   - `setGoogleTasksListMappings` if list selection is user-controlled
2. Hook into existing task/list mutations:
   - After local create/update/delete, enqueue Google Tasks sync
3. Background sync:
   - Add a cron-triggered API route similar to Todoist
   - Guard with secret or internal auth token

## Phase 7: Settings UI

1. `GoogleTasksSettings` component:
   - OAuth connect button (Google sign-in)
   - Sync now, disconnect, rotate tokens
   - Show last sync status and errors
2. Optional list mapping UI:
   - Allow users to select which lists sync to Google Tasks
3. Conflict resolution UI:
   - Reuse existing conflicts component pattern

## Phase 8: Security and Reliability

- Encrypt access and refresh tokens at rest (reuse existing encryption utilities).
- Store scopes and expiry timestamps to handle refresh logic.
- Add retry with exponential backoff for transient API errors.
- Log sync failures in `external_sync_state.error` and surface to UI.

## Phase 9: Tests and Validation

1. Unit tests:
   - Mapping functions (task and tasklist conversions)
   - Conflict detection logic
2. Integration tests:
   - Mock Google Tasks API responses
   - Validate full sync and incremental sync flows
3. Update test DB setup to include new columns and provider enum values.

## Deliverables

- New Google Tasks client and sync engine modules
- Server actions and settings UI entry point
- Schema updates and migrations (Postgres + SQLite)
- Comprehensive tests for mapping and conflict handling

## Milestones

1. Schema updates and provider expansion
2. Google Tasks client + mapping helpers
3. Initial full sync (Google → local)
4. 2-way incremental sync with conflict tracking
5. Settings UI and OAuth flow
6. Tests + reliability hardening
