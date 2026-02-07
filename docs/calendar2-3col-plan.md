# Calendar2 Three-Column Planning View — Implementation Plan

## Overview

Redesign the `/calendar2` page into a 3-column planning layout inspired by the reference design. The three columns are:

1. **Left — Unplanned Tasks**: Shows tasks from the list currently selected in the sidebar (no due date)
2. **Middle — Today**: Always displays today's tasks (timed + untimed + done section)
3. **Right — Calendar Grid**: FullCalendar multi-day time grid (default 3 days) with colored task blocks, current time indicator, and all-day slots

Tasks from the left and middle columns are **draggable onto the calendar**, which assigns them a `dueDate` (and time).

---

## Architecture

### Component Tree

```
/calendar2/page.tsx (Server Component — data fetching)
└── Calendar2Loader (dynamic import, SSR disabled)
    └── Calendar2Client (state orchestrator)
        ├── CalendarSidebar (existing — add "selected list" click)
        └── CalendarPlanningLayout (new — 3-column grid)
            ├── UnplannedColumn (new)
            │   ├── "Add..." quick create input
            │   └── DraggableTaskRow[] (external drag source)
            ├── TodayColumn (new)
            │   ├── "Add..." quick create input
            │   ├── Timed tasks section
            │   ├── Untimed tasks section
            │   └── Collapsible "Done" section
            └── CalendarMain (existing — reconfigured)
                └── FullCalendar (timeGridThreeDay default view, droppable)
```

### Drag-and-Drop Strategy

**Use FullCalendar's external drag API** (`Draggable` from `@fullcalendar/interaction`) instead of bridging `@dnd-kit`. This avoids brittle pointer-to-datetime coordinate math — FullCalendar already handles snapping, all-day detection, and duration calculation.

- `@dnd-kit` remains for **in-list sorting** (sidebar lists, labels, task reordering)
- FullCalendar's `Draggable` handles **cross-panel → calendar** drops
- These two systems coexist without conflict as long as we use separate drag handles

---

## Implementation Phases

### Phase 1: State & Data Layer

**File: `src/components/calendar2/Calendar2Client.tsx`**

1. Add `selectedListId` state (default: `null` = Inbox, or synced from URL/sidebar)
2. Add memoized task selectors:
   - `unplannedTasks` = tasks where `listId === selectedListId && dueDate === null && !isCompleted`
   - `todayTasks` = tasks where dueDate is today and `!isCompleted`, sorted by time
   - `todayDoneTasks` = tasks where dueDate is today and `isCompleted`
3. Add `handleExternalDrop` callback:
   - Receives `taskId` and `newDueDate` from calendar drop
   - Optimistically updates task store
   - Dispatches `updateTask` via sync system
4. Pass `selectedListId` and setter to `CalendarSidebar`

**File: `src/components/calendar2/CalendarSidebar.tsx`**

5. Make list rows clickable to set `selectedListId` (in addition to existing visibility checkboxes)
6. Visually highlight the selected list

### Phase 2: Three-Column Layout

**New file: `src/components/calendar2/CalendarPlanningLayout.tsx`**

7. Create a responsive 3-column CSS grid container:
   - Left: `w-[320px] shrink-0` (or similar fixed/flex width)
   - Middle: `w-[320px] shrink-0`
   - Right: `flex-1 min-w-0`
   - Vertical dividers between columns
   - All columns scroll independently (`overflow-y-auto`)

### Phase 3: Unplanned Column (Left)

**New file: `src/components/calendar2/UnplannedColumn.tsx`**

8. Header: Title showing selected list name + task count
9. "Add..." input (reuse `CreateTaskInput` or a simplified variant)
10. Task list rendering:
    - Group tasks by priority or show flat (start with flat list, iterate)
    - Each task wrapped in a `DraggableTaskRow` component
11. Show task metadata: checkbox, title, list info, labels, priority flag

**New file: `src/components/calendar2/DraggableTaskRow.tsx`**

12. Renders a task card with:
    - `data-task-id`, `data-task-title`, `data-duration` attributes (for FullCalendar external drag)
    - CSS class `.fc-external-task` for Draggable item selector
    - Checkbox for completion toggle
    - Task title, priority indicator, labels, time estimate
    - Drag handle or entire row draggable

### Phase 4: Today Column (Middle)

**New file: `src/components/calendar2/TodayColumn.tsx`**

13. Header: "Today" with `< >` date navigation arrows (optional: allow browsing other days)
14. "Add..." quick create with default due date = today
15. Task sections:
    - **Timed tasks**: Tasks with a specific time, showing time badge (e.g., "10:00 AM")
    - **Untimed tasks**: Tasks due today with no time component
    - Each task is also a `DraggableTaskRow` (draggable to calendar to set a specific time)
16. Collapsible **"Done"** section at bottom with completed today tasks (strikethrough style)

### Phase 5: Calendar Grid (Right) — Reconfigure CalendarMain

**File: `src/components/calendar2/CalendarMain.tsx`**

17. Change default view to `timeGridThreeDay`:
    ```ts
    views: {
      timeGridThreeDay: { type: "timeGrid", duration: { days: 3 } }
    }
    initialView: "timeGridThreeDay"
    ```
18. Update header toolbar:
    - Left: `prev,next today`
    - Center: `title`
    - Right: `timeGridThreeDay,timeGridWeek,timeGridDay`
19. Enable external drops:
    - `droppable={true}`
    - Add `eventReceive` handler
20. Add `allDaySlot={true}` explicitly
21. Keep existing `nowIndicator`, `editable`, `eventDrop`, `eventResize`

### Phase 6: External Drag Integration

**New hook: `src/components/calendar2/hooks/useExternalDrag.ts`**

22. Create a hook that takes a container ref and initializes FullCalendar's `Draggable`:
    ```ts
    import { Draggable } from "@fullcalendar/interaction";
    
    export function useExternalDrag(containerRef: RefObject<HTMLElement | null>) {
      useEffect(() => {
        if (!containerRef.current) return;
        const draggable = new Draggable(containerRef.current, {
          itemSelector: ".fc-external-task",
          eventData: (el) => ({
            title: el.dataset.taskTitle,
            duration: { minutes: Number(el.dataset.duration) || 30 },
            extendedProps: { taskId: Number(el.dataset.taskId) },
            backgroundColor: el.dataset.listColor || undefined,
            borderColor: el.dataset.listColor || undefined,
          }),
        });
        return () => draggable.destroy();
      }, [containerRef]);
    }
    ```

23. Apply hook in both `UnplannedColumn` and `TodayColumn`

**File: `src/components/calendar2/CalendarMain.tsx`** — `eventReceive` handler

24. When an external task is dropped on the calendar:
    ```ts
    onEventReceive={(info) => {
      const taskId = Number(info.event.extendedProps.taskId);
      const newDueDate = info.event.start;
      const isAllDay = info.event.allDay;
      
      // Remove FC's internally-created event (we use controlled events)
      info.event.remove();
      
      // Call parent's handler to update task store + sync
      onExternalDrop(taskId, newDueDate, isAllDay);
    }}
    ```

25. In `Calendar2Client`, `onExternalDrop`:
    - If `isAllDay`: set dueDate to start of day (midnight)
    - Else: use exact datetime from drop
    - Optimistic update via `useTaskStore.getState().upsertTask()`
    - Dispatch via sync: `dispatch("updateTask", taskId, userId, { dueDate, ... })`

### Phase 7: Styling & Polish

26. Dark theme styling matching the reference:
    - Deep dark background for columns
    - Subtle borders/dividers between columns
    - Colored task blocks on calendar matching list colors
    - Priority indicators (colored flags/triangles)
    - Time badges on today's tasks
    - Current time indicator line (orange/red) — FullCalendar provides this via `nowIndicator`
27. Custom FullCalendar CSS overrides in `globals.css`:
    - Event block styling (rounded corners, padding, checkbox icon)
    - Day header highlighting for current day
    - Time grid density and font sizes
28. Responsive considerations:
    - On smaller screens, consider collapsing left column or stacking
    - Minimum viable: desktop-first (this is a planning power-user view)

### Phase 8: Task Interaction within Columns

29. Click on task → open `TaskDialog` for editing (reuse existing `TaskEditModalWrapper`)
30. Checkbox toggle → complete/uncomplete via sync dispatch
31. When a task moves from Unplanned → Calendar (gets a dueDate), it disappears from the left column (reactive via memo selectors)
32. When a task is completed from Today column, it moves to the "Done" section

---

## Dependencies

| Package | Status | Notes |
|---------|--------|-------|
| `@fullcalendar/react` v7 | ✅ Installed | Already in use |
| `@fullcalendar/interaction` | ⚠️ Check | Need `Draggable` class for external drag — may be bundled with `@fullcalendar/react` v7 or need separate install |
| `@dnd-kit/core` | ✅ Installed | NOT used for calendar drops — only for existing list sorting |
| `date-fns` | ✅ Installed | Date comparisons (startOfDay, isToday, etc.) |

**Action**: Verify if `@fullcalendar/react` v7 bundles the interaction/Draggable API or if a separate import is needed. The existing code imports `interactionPlugin` from `@fullcalendar/react/interaction`.

---

## New Files

| File | Purpose |
|------|---------|
| `src/components/calendar2/CalendarPlanningLayout.tsx` | 3-column grid container |
| `src/components/calendar2/UnplannedColumn.tsx` | Left column — list tasks without due dates |
| `src/components/calendar2/TodayColumn.tsx` | Middle column — today's tasks |
| `src/components/calendar2/DraggableTaskRow.tsx` | Task card with external drag data attributes |
| `src/components/calendar2/hooks/useExternalDrag.ts` | Hook to initialize FullCalendar Draggable |

## Modified Files

| File | Changes |
|------|---------|
| `src/app/calendar2/page.tsx` | Minor: remove/adjust header text, ensure all data passed |
| `src/components/calendar2/Calendar2Client.tsx` | Add `selectedListId`, task selectors, `onExternalDrop`, new layout |
| `src/components/calendar2/CalendarMain.tsx` | Default to `timeGridThreeDay`, add `droppable`, `eventReceive` |
| `src/components/calendar2/CalendarSidebar.tsx` | Add click-to-select list, highlight selected |
| `src/app/globals.css` | FullCalendar custom theme overrides for 3-col layout |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| FullCalendar v7 beta type gaps for `eventReceive`, `droppable` | Use targeted `@ts-expect-error` or `as any` casts, localized to CalendarMain |
| Pointer conflicts between dnd-kit and FC Draggable | Don't enable dnd-kit sorting in calendar2 columns; use separate drag handles if needed |
| Controlled events duplication on drop | Call `info.event.remove()` immediately in `eventReceive` before optimistic update |
| Performance with many tasks | Memoize selectors, use `React.memo` on DraggableTaskRow, virtualize if > 100 tasks per column |
| Date normalization edge cases | Reuse existing `getTaskDueDate` normalizer; ensure consistent Date vs string handling |

---

## Estimated Effort

| Phase | Effort | Status |
|-------|--------|--------|
| Phase 1: State & Data | 2–3 hours | ✅ Done |
| Phase 2: Layout | 1 hour | ✅ Done |
| Phase 3: Unplanned Column | 2–3 hours | ✅ Done |
| Phase 4: Today Column | 2–3 hours | ✅ Done |
| Phase 5: Calendar Reconfiguration | 1 hour | ✅ Done |
| Phase 6: External Drag Integration | 3–4 hours | ✅ Done |
| Phase 7: Styling & Polish | 3–4 hours | ✅ Done |
| Phase 8: Task Interaction | 2 hours | ✅ Done |
| **Total** | **~2 days** | |

## Implementation Notes

### Completed (All Phases)

All functionality and styling is implemented. Build and lint pass cleanly.

**Phase 1–6, 8 (Core):**
- `Draggable` from `@fullcalendar/react` is bundled in v7 — no extra dependency needed
- `CalendarSidebar` — clickable list selection (highlighted with `bg-accent`), checkboxes for calendar visibility
- `CalendarMain` — `timeGridThreeDay` default, `droppable` + `eventReceive` for external drops, `info.event.remove()` prevents duplicates
- `Calendar2Client` — orchestrates state: `selectedListId`, memoized task selectors, `handleExternalDrop`, `TaskDialog` for editing
- Type fix: `slotLabelFormat` uses `Record<string, unknown>` spread instead of `@ts-expect-error`

**Phase 7 (Styling & Polish):**
- FullCalendar dark theme CSS variables overriding `--fc-classic-*` to match app theme (background, borders, now indicator in orange)
- Thin scrollbars via `.calendar2-column` class — hidden by default, thin on hover
- `DraggableTaskRow` — compact task cards with time badges (green/red for overdue), priority flags, grab cursor, green completion checkbox
- `CalendarSidebar` — compact `w-52` with `text-xs`, hover states, color dots
- `UnplannedColumn` / `TodayColumn` — native `overflow-y-auto` replacing ScrollArea, `bg-card/30` backgrounds
- `CalendarPlanningLayout` — 300px columns with `bg-card/30`, no outer border
- Done section with `CheckCircle2` icon and border-top separator
- `.calendar-event-completed` class for strikethrough completed events on calendar
