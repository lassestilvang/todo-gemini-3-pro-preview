# Feature Plan: Period-Based Task Scheduling (Week/Month/Year)

**Status:** In Progress  
**Created:** 2026-02-10  
**Complexity:** Large (1–2 days)

## Overview

Allow users to schedule tasks for a specific **week**, **month**, or **year** instead of requiring a specific date. A task like "Clean the garage" can be assigned to "sometime this week" rather than a specific Tuesday.

## Non-goals (for initial release)

- Range selection (e.g., "week of Apr 7–14" or custom spans)
- Partial-period scheduling (e.g., "late March")
- Multiple period anchors on the same task (only one precision per task)
- Backfilling or auto-migrating existing due dates to periods

---

## Design Decision: `dueDate` + `dueDatePrecision`

Rather than adding a separate `duePeriod` string column (e.g., `"2025-W15"`), we add a single `dueDatePrecision` enum column alongside the existing `dueDate`. The `dueDate` stores the **anchor** (start of the period), and `dueDatePrecision` tells the system how to interpret it.

**Why this approach:**
- Preserves existing indexes and sort order on `dueDate`
- Calendar can still place items (on the anchor date)
- No new parsing/formatting layer for period strings
- Full backward compatibility: old tasks have `dueDatePrecision = null` → interpreted as `"day"`

**Invariant:**
- `dueDate = NULL` → `dueDatePrecision` must be `NULL`
- `dueDate != NULL` → `dueDatePrecision` is `NULL` (= "day") or `"week"` | `"month"` | `"year"`

**Timezone & locale considerations:**
- Store `dueDate` in UTC as today, but compute anchors in the user's local timezone to avoid period drift.
- Week anchor must respect user settings (`weekStartsOnMonday`).
- Use `startOfDay`/`startOfWeek`/`startOfMonth`/`startOfYear` from a single utility layer to avoid inconsistent boundary logic.

---

## Implementation Phases

### Phase 1: Data Model & Core Utilities
- [x] **1.1** Add `dueDatePrecision` column to `tasks` in `src/db/schema.ts`
  - `text("due_date_precision", { enum: ["day", "week", "month", "year"] })`
  - Nullable, default `null` (backward-compatible = specific day)
- [x] **1.2** Mirror the column in `src/db/schema-sqlite.ts` for tests
- [x] **1.3** Generate Drizzle migration (`bun run db:generate`)
- [x] **1.4** Update `Task` type in `src/lib/types.ts`
  - Add `dueDatePrecision?: "day" | "week" | "month" | "year" | null;`
- [x] **1.5** Update Zod schemas in `src/lib/validation/tasks.ts`
  - Add `dueDatePrecision: z.enum(["day", "week", "month", "year"]).optional().nullable()`
- [x] **1.6** Create `src/lib/due-utils.ts` with core helpers:
  ```ts
  type DuePrecision = "day" | "week" | "month" | "year";
  
  // Normalize a date to the start of its period
  normalizeDueAnchor(d: Date, precision: DuePrecision, weekStartsOnMonday: boolean): Date
  
  // Get the [start, endExclusive) range for a period
  getDueRange(anchor: Date, precision: DuePrecision, weekStartsOnMonday: boolean): { start: Date; endExclusive: Date }
  
  // Human-readable label: "Week of Apr 7", "March 2025", "2025"
  formatDuePeriod(task: { dueDate: Date; dueDatePrecision?: DuePrecision | null }): string
  
  // Is the task overdue? (period tasks: overdue only after period ends)
  isDueOverdue(task, now: Date): boolean
  
  // Does the task's period contain today?
  isInCurrentPeriod(task, now: Date, weekStartsOnMonday: boolean): boolean
  ```
- [x] **1.7** Add `DuePrecision` type export (shared by types, validation, and UI)
- [x] **1.8** Write unit tests for `due-utils.ts` (boundary cases, timezone edge cases)
- [x] **1.9** Add guard helper to enforce invariant when saving (`coerceDuePrecision`) to keep DB values consistent

### Phase 2: Server Actions & Query Layer
- [x] **2.1** Update `getTasks` in `src/lib/actions/tasks.ts`
  - Include `dueDatePrecision` in the select fields
  - Update the `"today"` filter: include period tasks whose range contains today
  - Update the `"upcoming"` filter: include period tasks with range overlapping future
- [x] **2.2** Update `createTask` and `updateTask` to accept and persist `dueDatePrecision`
  - When setting `dueDatePrecision`, auto-normalize `dueDate` to start of period
  - When clearing `dueDate`, also clear `dueDatePrecision`
- [x] **2.2a** If `dueDatePrecision` is omitted, preserve existing precision on update
- [x] **2.3** Update `createTaskSafe` and `updateTaskSafe` wrappers
- [x] **2.4** Update `getTask` (single task fetch) to include `dueDatePrecision`
- [x] **2.5** Update search action to include `dueDatePrecision` in results
- [x] **2.6** Add/update tests in `actions.test.ts`

### Phase 3: NLP Parser
- [x] **3.1** Extend `ParsedTask` interface in `src/lib/nlp-parser.ts`
  - Add `dueDatePrecision?: "day" | "week" | "month" | "year"`
- [x] **3.2** Add new regex patterns:
  - `this week` / `next week` → precision: `"week"`, anchor: startOfWeek
  - `this month` / `next month` → precision: `"month"`, anchor: startOfMonth
  - `this year` / `next year` → precision: `"year"`, anchor: startOfYear
- [x] **3.2a** Support short forms like `next wk`, `next mo`, `this yr` (optional, lower priority)
- [x] **3.3** Update parser signature to accept `{ weekStartsOnMonday?: boolean }` option
- [x] **3.4** Update `CreateTaskInput.tsx` to pass `weekStartsOnMonday` and handle `dueDatePrecision`
- [x] **3.5** Add parser tests for new patterns

### Phase 4: Task Edit UI (TaskDetailsTab)
- [x] **4.1** Add a **segmented control / Select** for due date precision in `TaskDetailsTab.tsx`
  - Options: `Specific Date` | `Week` | `Month` | `Year`
  - Placed above or inline with the existing DatePicker
- [x] **4.2** Conditional picker based on precision:
  - `"day"`: existing DatePicker + TimePicker (no change)
  - `"week"`: DatePicker (click selects the week containing that day), display "Week of Apr 7"
  - `"month"`: Month/year dropdown selector
  - `"year"`: Year dropdown selector
- [x] **4.3** Hide TimePicker when precision is not `"day"`
- [x] **4.4** Update `useTaskForm.ts` hook to manage `dueDatePrecision` state
- [x] **4.5** Update `TaskDialog.tsx` to pass `dueDatePrecision` through
- [x] **4.6** Ensure keyboard navigation remains usable (no mouse-only month/year pickers)

### Phase 5: Task Display (TaskItem)
- [x] **5.1** Update due date display in `TaskItem.tsx`
  - Day precision: no change (current "Apr 7" / "Today" / "Tomorrow")
  - Week precision: show "Week of Apr 7" with a distinct icon/badge
  - Month precision: show "March 2025"
  - Year precision: show "2025"
- [x] **5.2** Update overdue logic
  - Period tasks: only overdue after the period **ends** (not after the anchor date)
- [x] **5.3** Add visual differentiation (e.g., a small `W` / `M` / `Y` badge or different calendar icon)
- [x] **5.4** Update tooltips/aria-labels to mention period ("Due this week")

### Phase 6: View Integration
- [x] **6.1** **Today view**: Add a collapsible "This Week" / "This Month" / "This Year" section below the main task list for period tasks whose range includes today
- [x] **6.2** **Upcoming view**: Group period tasks by their period label
  - Week tasks grouped as "Week of Apr 7"
  - Month tasks grouped as "March 2025"
  - Year tasks grouped as "2025"
- [x] **6.3** **Calendar view**: Render period tasks in a dedicated bottom section ("Sometime this week") similar to Hey/Timestripe, rather than as anchored events
- [x] **6.4** **All / Inbox views**: Show formatted period label (no special grouping needed)
- [x] **6.5** Add analytics hooks for new precision usage (if analytics enabled)

### Phase 7: Sync & Offline Support
- [x] **7.1** Update Zustand task store (`src/lib/store/task-store.ts`) to include `dueDatePrecision`
- [x] **7.2** Update sync registry if `dueDatePrecision` affects action payloads
- [x] **7.3** Update IndexedDB cache schema if needed
- [x] **7.4** Add migration in IndexedDB versioning so cached tasks stay readable

### Phase 8: Edge Cases & Polish
- [x] **8.1** "Promote" period → specific date: when user switches precision to "day", open DatePicker focused within the period range
- [x] **8.2** "Demote" specific date → period: switching precision auto-normalizes the anchor
- [x] **8.3** Reminders: allow reminders with explicit day selection inside the period (default to first day of period)
- [x] **8.4** Recurring tasks: ensure recurring rule + period precision interact correctly
- [x] **8.5** Smart Scheduler / AI actions: update to understand period tasks
- [x] **8.6** Template system: include `dueDatePrecision` in template data
- [x] **8.7** Ensure export/import (CSV or time export) includes precision metadata
- [x] **8.8** Decide behavior when changing timezone settings (re-anchor vs display-only) — **Decision:** display-only; keep stored anchors fixed.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/db/schema.ts` | Add `dueDatePrecision` column to `tasks` |
| `src/db/schema-sqlite.ts` | Mirror column for tests |
| `src/lib/types.ts` | Add `dueDatePrecision` to `Task` interface |
| `src/lib/validation/tasks.ts` | Add field to Zod schemas |
| `src/lib/due-utils.ts` | **New file** - period range/formatting helpers |
| `src/lib/validation/types.ts` | If shared enums live here (confirm current structure) |
| `src/lib/nlp-parser.ts` | Add "this week", "next month", etc. patterns |
| `src/lib/time-utils.ts` | May need updates for period-aware formatting |
| `src/lib/actions/tasks.ts` | Update queries, create/update to handle precision |
| `src/lib/actions/task-safe.ts` | Pass through precision field |
| `src/components/tasks/task-dialog/TaskDetailsTab.tsx` | Add precision selector, conditional pickers |
| `src/components/tasks/hooks/useTaskForm.ts` | Manage precision state |
| `src/components/tasks/TaskDialog.tsx` | Pass precision prop |
| `src/components/tasks/TaskItem.tsx` | Display period labels, update overdue logic |
| `src/components/tasks/CreateTaskInput.tsx` | Handle NLP precision results |
| `src/components/tasks/TaskList.tsx` | No change expected |
| `src/components/tasks/TaskListWithSettings.tsx` | May need grouping logic for periods |
| `src/app/today/page.tsx` | Add period task section |
| `src/app/upcoming/page.tsx` | Add period-based grouping |
| `src/lib/store/task-store.ts` | Include precision in store |
| `src/lib/sync/registry.ts` | Update if action payloads change |

---

## Overdue Semantics

| Precision | Overdue When |
|-----------|-------------|
| `day` (or `null`) | `dueDate < startOfToday` (existing behavior) |
| `week` | End of the week has passed |
| `month` | End of the month has passed |
| `year` | End of the year has passed |

**Rule detail:** Overdue should compare against `endExclusive` of the period in the user's local timezone. This avoids week/month boundaries drifting across DST changes.

---

## Display Format Examples

| Precision | Example Display | Badge |
|-----------|----------------|-------|
| `day` | "Apr 7" / "Today" / "Tomorrow" | (none) |
| `week` | "Week of Apr 7" | `W` |
| `month` | "March 2025" | `M` |
| `year` | "2025" | `Y` |

---

## NLP Examples

| Input | Parsed |
|-------|--------|
| `"Clean garage this week"` | title: "Clean garage", precision: "week", anchor: startOfWeek(today) |
| `"Tax prep next month"` | title: "Tax prep", precision: "month", anchor: startOfMonth(nextMonth) |
| `"Learn piano this year"` | title: "Learn piano", precision: "year", anchor: startOfYear(today) |
| `"Buy milk tomorrow"` | title: "Buy milk", precision: "day" (unchanged) |

---

## Testing Strategy

1. **Unit tests** for `due-utils.ts`: period range calculations, overdue detection, boundary days
2. **Unit tests** for NLP parser: new period patterns
3. **Integration tests** for server actions: create/update with precision, query filtering
4. **E2E tests**: create task with period scheduling, verify display in Today/Upcoming views

## Open Questions

1. Should period tasks appear in the calendar as all-day events spanning the entire period (instead of just the anchor)? Answered: show them in a dedicated bottom section ("Sometime this week").
2. Should reminders be blocked entirely or allowed with a specific day selection inside the period? Answered: allow, with explicit day selection.
3. Should the week anchor follow ISO week numbers in locales that default to Monday? Answered: yes.
