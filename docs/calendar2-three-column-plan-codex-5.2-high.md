# Calendar3 Three-Column Layout + Drag-to-Calendar Plan

> **Route:** `/calendar3` (new; keep `/calendar2` unchanged)  \
> **Goal:** 3-column layout with **Selected List** (left), **Today** (middle), and **Calendar** (right). Tasks from left + middle can be dragged onto the calendar to schedule.

---

## 1. Goals

- Build a new `/calendar3` route and keep `/calendar2` intact.
- Left column shows the **list selected in the main sidebar**.
- Middle column is **always “Today”**.
- Right column is the **calendar**.
- Tasks from left/middle can be **dragged onto the calendar** to set date/time.

## 2. Non‑Goals (for this iteration)

- No change to the underlying task schema.
- No changes to `/calendar` (classic route).
- No new AI scheduling logic.
- No changes to list ordering or list creation flows.

---

## 3. Current Baseline

- `/calendar2` currently renders:
  - `CalendarSidebar` (list toggles)
  - `CalendarMain` (FullCalendar)
- No external drag sources.
- Tasks and lists are already loaded server-side and hydrated into stores.

---

## 4. UX / Layout Plan

### 4.1 Three-Column Shell

Use a fixed 3-column layout inside the new `Calendar3Client`:

- **Left column**: Selected list from main sidebar
- **Middle column**: Today
- **Right column**: FullCalendar

Suggested layout structure:

```
┌──────────────┬──────────────┬───────────────────────────┐
│ Selected     │ Today        │ Calendar                  │
│ List         │              │                           │
│ (tasks)      │ (tasks)      │                           │
└──────────────┴──────────────┴───────────────────────────┘
```

### 4.2 Column UI

Each task column should include:

- Header with title + optional icon/color
- Compact “Add…” input (or existing `CreateTaskInput` styled compact)
- Scrollable task list with grouping:
  - Active tasks
  - Collapsible “Done” section (matches screenshot)

### 4.3 Calendar Column

- FullCalendar stays on the right
- Keep existing toolbar and view switching
- Add **droppable** support for external task dragging

---

## 5. Selected List Source (Sidebar Integration)

### 5.1 URL-driven selection (recommended)

Use query param on `/calendar3`:

- `/calendar3?listId=123`

Then update sidebar list links **only when on `/calendar3`**:

- If `pathname.startsWith("/calendar3")`, link to `/calendar3?listId=<id>`
- Highlight active list based on `useSearchParams()`

### 5.2 Fallbacks

If `listId` is missing or invalid:

- Default to first list by position
- If no lists exist, default to Inbox (listId = `null`)

---

## 6. Data + Filtering Rules

### 6.1 Selected List Column

Filter rules (default + user choice):

- `task.listId === selectedListId`
- Show **incomplete** tasks first
- Collapsible Done section (completed tasks)

User choice (confirmed):

- Add a toggle to switch between **All tasks** vs **Unscheduled only** (no `dueDate`).

### 6.2 Today Column

Filter rules (confirmed):

- `task.dueDate` between **startOfDay** and **endOfDay**
- Show incomplete tasks + “Done” section

Note: Today column includes **all tasks due today**, even if they also appear on the calendar.

---

## 7. Drag & Drop to Calendar

### 7.1 External Draggable Setup

Use FullCalendar’s external drag integration:

- Wrap each task row with `draggable` + `data-task-id`
- Initialize `new Draggable(containerEl, { ... })` for both columns
- `eventData` should include:
  - `id: task:<id>`
  - `title`
  - `duration` (optional, default 30m)
  - `extendedProps.taskId`

### 7.2 Calendar Drop Handling

In `CalendarMain`:

- Set `droppable={true}`
- Handle `eventReceive` (or `drop`) to update task

On drop:

- Compute new `dueDate` from drop date/time
- If drop lands on all‑day slot → set date-only (start-of-day)
- If drop is timed and task has no `estimateMinutes`, **default to 30m** (confirmed)

### 7.3 Store + Sync Update

- Optimistically `useTaskStore.getState().upsertTask({...})`
- Dispatch `updateTask` via sync provider:

```
updateTask(taskId, userId, {
  dueDate: newDate,
  estimateMinutes: maybeDefault,
  expectedUpdatedAt: existing.updatedAt ?? null
})
```

### 7.4 Avoid Duplicate Events

Potential issue: tasks from Today column may already exist on the calendar.
Mitigation strategy:

- After `eventReceive`, call `info.event.remove()` and rely on the task store re-render
- Alternatively, only allow drag for tasks **not already scheduled**

---

## 8. Component Plan (Files)

### 8.1 Calendar3 Layout

- Add new route `src/app/calendar3/page.tsx` (mirrors calendar2 loader pattern)
- Create `src/components/calendar3/Calendar3Client.tsx`
  - Replace `CalendarSidebar` with new 2 task columns + calendar
  - Add selected list state from query param
  - Compute filtered task lists for selected list + today

### 8.2 New Column Components

Create new components under `src/components/calendar3/`:

- `Calendar3TaskColumn.tsx`
  - Header, add input, list container
  - Accept `tasks`, `title`, `listId`, `userId`, `draggableScope`

- `Calendar3TaskRow.tsx`
  - Wraps `TaskItem` with `draggable` + `data-task-id`

### 8.3 CalendarMain Updates

- Add props for external drop handling
- Enable `droppable`
- Wire `eventReceive` / `drop`

### 8.4 Sidebar Link Update

- Update `src/components/layout/sidebar/SidebarLists.tsx`
  - Detect `/calendar3`
  - Use `useSearchParams()` to highlight active list
  - Link lists to `/calendar3?listId=<id>` when on that page

---

## 9. Styling + Layout Details

- Use `grid` or `flex` with fixed widths for left/middle columns (`w-[320px]`)
- Ensure scrollable task columns with `min-h-0` and `overflow-y-auto`
- Keep overall container height `h-full` and avoid clipping calendar
- Add subtle visual drag handle (e.g., `GripVertical`) for discoverability

---

## 10. Testing & QA

### 10.1 Manual QA

- Navigate to `/calendar3` with and without `listId`
- Verify list column updates when clicking a list in sidebar
- Drag tasks from list/today into calendar:
  - Due date/time updates correctly
  - Task appears on calendar
  - No duplicates
- Drag tasks within calendar still works (existing behavior)

### 10.2 Unit/Component Tests (optional)

- Filter helpers for Today + Selected List
- “Done” grouping logic

---

## 11. Risks & Mitigations

- **Duplicate events** when dragging from Today list
  - Mitigate by removing event on `eventReceive` and relying on store update
- **Dnd-kit conflict** with FullCalendar draggable
  - Use **native draggable** wrappers in the calendar columns (no Dnd-kit there)
- **Sidebar navigation confusion**
  - Only hijack list links when already on `/calendar3`

---

## 12. Open Questions

- None (resolved):
  - Selected list supports user toggle (All vs Unscheduled)
  - Today column shows all tasks due today
  - Drop defaults to 30m if no estimate

---

## 13. Implementation Order

1. Add `/calendar3` route and page wiring
2. Update sidebar list links for `/calendar3` selection
3. Build new calendar3 task column components
4. Update `Calendar3Client` layout + filtering
5. Add external drag integration + drop handler
6. Polish styling + responsive behavior
7. Manual QA
