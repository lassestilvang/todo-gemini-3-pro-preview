# Calendar V2 — Implementation Plan (Revised)

> **Route:** `/calendar2` (beta)  \
> **Library:** FullCalendar v7  \
> **Goal:** Replace the current read-only month grid with a best-in-class interactive calendar rivaling Google Calendar and Fantastical

---

## Table of Contents

1. [Overview & Vision](#1-overview--vision)
2. [Architecture](#2-architecture)
3. [Installation & Setup](#3-installation--setup)
4. [Data Model: Task → Event Mapping](#4-data-model-task--event-mapping)
5. [Multiple Calendars (Lists as Event Sources)](#5-multiple-calendars-lists-as-event-sources)
6. [Core Interactions](#6-core-interactions)
7. [Enhanced UX Features](#7-enhanced-ux-features)
8. [Calendar Settings & Persistence](#8-calendar-settings--persistence)
9. [Theme & Dark Mode Integration](#9-theme--dark-mode-integration)
10. [Performance Strategy](#10-performance-strategy)
11. [Recurring Tasks](#11-recurring-tasks)
12. [Server Actions & Offline Sync](#12-server-actions--offline-sync)
13. [Mobile & Responsive Design](#13-mobile--responsive-design)
14. [Testing Strategy](#14-testing-strategy)
15. [File Structure](#15-file-structure)
16. [Implementation Phases](#16-implementation-phases)
17. [Risks & Mitigations](#17-risks--mitigations)

---

## 1. Overview & Vision

The current calendar (`/calendar`) is a custom month-only grid with no interactivity — tasks are read-only badges. Calendar V2 transforms this into a **full scheduling surface** where users can:

- **See** their tasks across month, week, and day views
- **Drag** tasks to reschedule them instantly
- **Resize** tasks to change their estimated duration
- **Create** tasks by clicking or dragging on empty time slots
- **Toggle** list visibility like separate calendars (Google Calendar style)
- **Filter** by priority, labels, energy level, and context
- **Navigate** with keyboard shortcuts for power users

**Route strategy:** `/calendar2` is a beta route. The existing `/calendar` remains untouched for now.

**Time semantics:** timestamps are stored without timezone in the DB. For display, FullCalendar renders in the user’s local timezone. A due date at midnight is treated as **all-day**.

---

## 2. Architecture

### 2.1 Page Layout — 3-Pane Design

```
┌─────────────────────────────────────────────────────┐
│  App Sidebar (existing)                             │
├──────────┬──────────────────────────┬───────────────┤
│ Calendar │                          │  Detail       │
│ Sidebar  │   FullCalendar Main      │  Panel        │
│          │                          │  (optional)   │
│ • Mini   │   Month / Week / Day     │               │
│   Month  │                          │  Selected     │
│ • List   │                          │  task info,   │
│   Toggle │                          │  quick edit   │
│ • Filter │                          │               │
│ • Unsched│                          │               │
│   Tasks  │                          │               │
└──────────┴──────────────────────────┴───────────────┘
```

- **Calendar Sidebar** (left, collapsible): Mini month navigator, list toggles, filters, unscheduled task tray
- **Main Area**: FullCalendar with toolbar (view switcher, navigation, today button)
- **Detail Panel** (right, collapsible): Task details / quick edit when an event is clicked; collapses to a Sheet on mobile

### 2.2 Component Hierarchy

```
src/app/calendar2/page.tsx              (RSC — auth, fetch lists)
└── Calendar2Client.tsx                 (client, dynamic import, no SSR)
    ├── CalendarSidebar.tsx             (mini month, list toggles, filters)
    │   ├── MiniMonthPicker.tsx         (small month grid for navigation)
    │   ├── CalendarListToggles.tsx     (list visibility checkboxes)
    │   ├── CalendarFilters.tsx         (priority, label, energy filters)
    │   └── UnscheduledTasksTray.tsx    (tasks without dueDate)
    ├── CalendarMain.tsx                (FullCalendar wrapper)
    │   ├── CalendarToolbar.tsx         (view switcher, navigation)
    │   └── CalendarEventContent.tsx    (custom event rendering)
    ├── CalendarDetailPanel.tsx         (task detail / quick edit)
    ├── CalendarQuickCreateDialog.tsx   (create task from time slot)
    └── CalendarContextMenu.tsx         (right-click actions)
```

---

## 3. Installation & Setup

### 3.1 Required FullCalendar Packages

Install FullCalendar core and plugins explicitly:

```bash
bun add @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/list @fullcalendar/interaction
```

### 3.2 CSS Imports

Import FullCalendar styles in the calendar bundle (or a calendar CSS module):

```ts
import "@fullcalendar/core/index.css";
import "@fullcalendar/daygrid/index.css";
import "@fullcalendar/timegrid/index.css";
import "@fullcalendar/list/index.css";
```

### 3.3 Optional shadcn Registry

If the shadcn registry works well for the team, it can be used as a scaffold. Otherwise, use manual integration and map shadcn CSS variables.

---

## 4. Data Model: Task → Event Mapping

### 4.1 Mapping Function

A pure function that converts the app’s `Task` type into FullCalendar’s `EventInput`:

```typescript
// src/components/calendar2/utils/task-to-event.ts

import type { Task } from "@/lib/types";
import type { EventInput } from "@fullcalendar/react";

function normalizeDate(value: Date | string | null): Date | null {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

function hasTimeComponent(date: Date): boolean {
  return date.getHours() !== 0 || date.getMinutes() !== 0 || date.getSeconds() !== 0;
}

export function taskToEvent(task: Task): EventInput | null {
  const dueDate = normalizeDate(task.dueDate);
  if (!dueDate) return null;

  const isAllDay = !hasTimeComponent(dueDate);

  return {
    id: `task:${task.id}`,
    title: task.icon ? `${task.icon} ${task.title}` : task.title,
    start: dueDate,
    allDay: isAllDay,
    backgroundColor: task.listColor || undefined,
    borderColor: task.listColor || undefined,
    classNames: [
      task.isCompleted ? "calendar-event-completed" : "",
      `priority-${task.priority || "none"}`,
    ].filter(Boolean),
    extendedProps: {
      taskId: task.id,
      listId: task.listId, // null = Inbox
      listName: task.listName,
      listColor: task.listColor,
      listIcon: task.listIcon,
      priority: task.priority,
      isCompleted: task.isCompleted,
      estimateMinutes: task.estimateMinutes,
      deadline: task.deadline,
      labels: task.labels,
      energyLevel: task.energyLevel,
      context: task.context,
      isRecurring: task.isRecurring,
      recurringRule: task.recurringRule,
      description: task.description,
      updatedAt: task.updatedAt,
    },
  };
}
```

### 4.2 Key Design Decisions

| Scenario | Behavior |
|----------|----------|
| Task has dueDate with time + estimateMinutes | Timed event with duration block |
| Task has dueDate with time, no estimate | Timed event with default duration (via `defaultTimedEventDuration`) |
| Task has dueDate (date-only, midnight) | All-day event in month/week header |
| Task has no dueDate | Not shown on calendar; appears in Unscheduled tray |
| Task is completed | Shown with reduced opacity + strikethrough, toggleable via filter |
| Task has deadline | Small deadline indicator (⚠️) on event chip |

### 4.3 Time Zone Rule

- Dates are stored as DB timestamps without timezone.
- FullCalendar renders in the user’s local timezone.
- “Date-only” detection: if hours/minutes/seconds are all 0, treat as all-day.

---

## 5. Multiple Calendars (Lists as Event Sources)

### 5.1 Concept

Each **List** in the app maps to a separate "calendar" with its own color and toggle. This mirrors Google Calendar’s multi-calendar model.

### 5.2 Event Sources

Use FullCalendar’s `eventSources` — one per list plus one for Inbox (`listId: null`). Visible lists are stored as a list of list IDs plus a `null` sentinel.

```typescript
const eventSources = useMemo(() => {
  const sources: EventSourceInput[] = [];

  for (const list of lists) {
    if (!visibleListIds.has(list.id)) continue;
    sources.push({
      id: `list:${list.id}`,
      events: getEventsForList(list.id, filters),
      color: list.color || "hsl(var(--primary))",
    });
  }

  // Inbox (tasks with no list)
  if (visibleListIds.has(null)) {
    sources.push({
      id: "list:inbox",
      events: getEventsForList(null, filters),
      color: "hsl(var(--primary))",
    });
  }

  return sources;
}, [lists, visibleListIds, filters, tasks]);
```

### 5.3 List Toggle UI

- Colored checkbox (matching list color)
- List icon + name
- Task count badge
- “All on/off” master toggle

**Note:** Dragging across list sources is not supported directly (requires FullCalendar Resources). Use the context menu “Move to List” instead.

---

## 6. Core Interactions

### 6.1 Drag-and-Drop Rescheduling

Use offline-first dispatch via `SyncProvider`:

```typescript
const handleEventDrop = (info: EventDropArg) => {
  const taskId = info.event.extendedProps.taskId;
  const newDueDate = info.event.start;

  // Optimistic update in Zustand store
  useTaskStore.getState().upsertTask({
    ...task,
    dueDate: newDueDate,
  });

  // Queue update via sync provider
  dispatch("updateTask", taskId, userId, {
    dueDate: newDueDate,
    expectedUpdatedAt: info.event.extendedProps.updatedAt ?? null,
  });
};
```

**Conflict behavior:** If a conflict occurs, SyncProvider surfaces a conflict dialog; do not immediately revert the UI. (Optional: show a “pending sync” toast.)

### 6.2 Resize to Change Duration

```typescript
const handleEventResize = (info: EventResizeArg) => {
  const taskId = info.event.extendedProps.taskId;
  const start = info.event.start!;
  const end = info.event.end!;
  const estimateMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

  useTaskStore.getState().upsertTask({
    ...task,
    estimateMinutes,
  });

  dispatch("updateTask", taskId, userId, {
    estimateMinutes,
    expectedUpdatedAt: info.event.extendedProps.updatedAt ?? null,
  });
};
```

### 6.3 Click-to-Create

**Month view — `dateClick`:**
- Opens `CalendarQuickCreateDialog` with dueDate prefilled (all-day)

**Week/Day view — `select` (drag to create):**
- Opens `CalendarQuickCreateDialog` with:
  - `dueDate` = selection start
  - `estimateMinutes` = selection duration

### 6.4 Event Click → Detail Panel

Selecting an event opens the task detail panel with quick edit (title, due date/time, list, priority, labels, estimate, completion, delete).

### 6.5 Right-Click Context Menu

| Action | Description |
|--------|-------------|
| ✅ Mark Complete | Toggle completion status |
| 📋 Move to List… | Submenu with all lists |
| 🔴🟡🔵 Set Priority | Quick priority toggle |
| 📅 Set Deadline | Add/change deadline |
| 📄 Duplicate | Create a copy on the same date |
| ❌ Remove Date | Clear dueDate (moves to Unscheduled) |
| 🗑️ Delete | Delete task |

---

## 7. Enhanced UX Features

### 7.1 Mini Month Navigator

Use existing `Calendar` UI primitive (`react-day-picker`). Clicking a day calls `calendarApi.gotoDate(date)`.

### 7.2 Unscheduled Tasks Tray

- Shows tasks **without dueDate**
- Drag from tray → calendar to schedule
- Filtered by list visibility

Implementation uses FullCalendar’s `Draggable` from the interaction plugin.

### 7.3 Keyboard Shortcuts

Scope to the calendar page/container to avoid global conflicts. Avoid `?` and `Shift+C`.

| Key | Action |
|-----|--------|
| `T` | Jump to today |
| `[` / `]` | Prev / next period |
| `M` | Month view |
| `W` | Week view |
| `D` | Day view |
| `A` | Agenda (list) view |
| `N` | Open quick create dialog |
| `Esc` | Close panel / dialog |

### 7.4 Agenda/List View

Use `listWeek` (or `listMonth`) plugin:
- Default on mobile
- Accessible in toolbar on desktop

### 7.5 Today Indicator & Now Line

- Now line in week/day views
- Auto-scroll to “now” when switching to week/day
- “Today” button gets a subtle badge when off-range

### 7.6 Smart Event Colors

Events inherit list color and apply modifiers:
- Priority border accents
- Completed = muted + strikethrough
- Deadline/overdue indicators
- Recurring badge (🔄)

### 7.7 Quick Add From Toolbar

A persistent “+” button opens a minimal task form with date defaulted to the currently viewed date.

---

## 8. Calendar Settings & Persistence

### 8.1 Persisted Settings (View Settings Columns)

Add explicit calendar columns to `view_settings`:

- `calendar_view_type` (text) — `dayGridMonth` | `timeGridWeek` | `timeGridDay` | `listWeek`
- `calendar_visible_list_ids` (text) — JSON array of list IDs, include `null` for Inbox
- `calendar_show_weekends` (boolean)
- `calendar_slot_min_time` (text, e.g., `"06:00:00"`)
- `calendar_slot_max_time` (text, e.g., `"22:00:00"`)
- `calendar_slot_duration` (text, e.g., `"00:30:00"`)
- `calendar_sidebar_collapsed` (boolean)
- `calendar_detail_panel_collapsed` (boolean)

Update:
- `src/db/schema.ts`
- `src/db/schema-sqlite.ts`
- `src/lib/actions/view-settings.ts` (`ViewSettingsConfig`)
- `src/lib/view-settings.ts` (mapping defaults)

### 8.2 Defaults

- View: Month
- All lists visible (including Inbox)
- Weekends shown
- Completed tasks hidden (`showCompleted = false` for calendar view only)
- Time range: 06:00–22:00
- Slot duration: 30 minutes

### 8.3 Settings UI

A toolbar settings popover with:
- Show weekends toggle
- Show completed tasks toggle
- Time range slider
- Slot duration selector
- Reset to defaults

---

## 9. Theme & Dark Mode Integration

Use `data-color-scheme` and rely on CSS variables:

```tsx
<div data-color-scheme={resolvedTheme === "dark" ? "dark" : "light"}>
  <FullCalendar ... />
</div>
```

Map FullCalendar variables to existing shadcn tokens in `globals.css` to preserve glassmorphism/synthwave themes.

---

## 10. Performance Strategy

### 10.1 Client-Side Range Filtering (Initial)

The app already loads tasks into the client store (`DataLoader`), so filter tasks by date range on the client.

### 10.2 Memoization

- Memoize event sources
- Memoize task-to-event mapping
- Use `React.memo` for event content renderer

### 10.3 Large Dataset Optimizations

- `dayMaxEvents: 4`
- `eventDisplay: "block"` in month view
- native `title` tooltips for dense days
- debounced filters

---

## 11. Recurring Tasks

### 11.1 V1: Read-Only Expansion

- Parse `recurringRule` with `rrule`
- Expand occurrences within visible range
- Each occurrence gets a unique ID: `task:${id}:${occurrenceISO}`
- Use `groupId: task:${id}` to link series

### 11.2 Interaction Restrictions

- Disable drag/resize for recurring occurrences
- Context menu: “Open Task” only (no per-occurrence completion in V1)

---

## 12. Server Actions & Offline Sync

Calendar interactions should use existing actions through `SyncProvider`:

- `createTask`
- `updateTask`
- `toggleTaskCompletion`
- `deleteTask`

If a future lightweight `updateTaskSchedule` is added, it must be registered in `src/lib/sync/registry.ts` and used via `dispatch` to preserve offline behavior.

---

## 13. Mobile & Responsive Design

| Breakpoint | Layout |
|-----------|--------|
| Desktop (≥1024px) | 3-pane layout |
| Tablet (768–1023px) | Calendar + sidebar overlay sheet |
| Mobile (<768px) | Agenda view default; details open in bottom sheet |

---

## 14. Testing Strategy

### 14.1 Unit Tests

- Task → event mapping
- Settings serialization/deserialization
- Recurring expansion logic

### 14.2 Integration Tests

- Update task via drag/resize (through `updateTask`)
- Authorization enforcement
- Invalid list ID handling

### 14.3 E2E Tests

- View switching
- Event render
- Drag-and-drop
- Click-to-create
- List toggle filtering
- Mobile agenda default

**Note:** FullCalendar components may need test mocks (Bun + happy-dom).

---

## 15. File Structure

```
src/
├── app/
│   └── calendar2/
│       └── page.tsx
│
├── components/
│   └── calendar2/
│       ├── Calendar2Client.tsx
│       ├── CalendarMain.tsx
│       ├── CalendarToolbar.tsx
│       ├── CalendarEventContent.tsx
│       ├── CalendarSidebar.tsx
│       │
│       ├── sidebar/
│       │   ├── MiniMonthPicker.tsx
│       │   ├── CalendarListToggles.tsx
│       │   ├── CalendarFilters.tsx
│       │   └── UnscheduledTasksTray.tsx
│       │
│       ├── CalendarDetailPanel.tsx
│       ├── CalendarQuickCreateDialog.tsx
│       ├── CalendarContextMenu.tsx
│       ├── CalendarSettingsPopover.tsx
│       │
│       └── utils/
│           ├── task-to-event.ts
│           ├── task-to-event.test.ts
│           ├── calendar-settings.ts
│           └── recurring-expander.ts
```

---

## 16. Implementation Phases

### Phase 1: Foundation (Core Calendar)
1. Install FullCalendar packages and CSS imports
2. Create `/calendar2` route with auth
3. Build `Calendar2Client` with FullCalendar rendering tasks from store
4. Implement `taskToEvent` mapping with tests
5. Add view switching (month/week/day/agenda)
6. Add navigation (prev/next/today)
7. Add sidebar navigation entry
8. Wire up dark mode via `data-color-scheme`

**Milestone:** Tasks with due dates render in all views.

### Phase 2: Interactions
1. Drag-and-drop rescheduling via `dispatch("updateTask")`
2. Resize to change duration
3. Click-to-create / drag-to-create dialog
4. Event click → detail panel
5. Context menu actions

**Milestone:** Full CRUD interactions from calendar.

### Phase 3: Multi-Calendar & Filters
1. Event sources per list + Inbox (null listId)
2. List toggles
3. Filters (priority, label, energy, context)
4. Show/hide completed toggle
5. Persist settings in `view_settings`

**Milestone:** List toggles + filters working and persisted.

### Phase 4: Enhanced UX
1. Mini month picker
2. Unscheduled tasks tray with drag support
3. Keyboard shortcuts (scoped)
4. Smart event colors
5. Recurring task display (read-only)
6. Settings popover (weekends/time range/slot duration)

**Milestone:** Power-user features complete.

### Phase 5: Polish & Testing
1. Mobile responsive layout
2. Theme verification (glassmorphism, synthwave, performance)
3. Performance tuning
4. E2E tests
5. Accessibility audit

**Milestone:** Production-ready, tested, performant.

---

## 17. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| FullCalendar v7 beta changes | Breaking updates | Pin version; isolate in wrapper component |
| Time semantics ambiguity | Events render on wrong day | Clear rule: midnight = all‑day |
| Recurring edit complexity | Data integrity issues | V1 display-only; series edits via TaskDialog |
| Performance with large datasets | Sluggish UI | Range filtering + dayMaxEvents + memoization |
| Mobile drag UX | Frustration on small screens | Agenda default on mobile; long-press hints |
| Offline conflicts | Stale UI | SyncProvider conflict dialog with expectedUpdatedAt |

---

## Appendix: Comparison with Current Calendar

| Feature | Current (`/calendar`) | V2 (`/calendar2`) |
|---------|----------------------|-------------------|
| Views | Month only | Month, Week, Day, Agenda |
| Interaction | Read-only | Drag, resize, click-to-create |
| Task creation | Cannot create from calendar | Click time slot → create with prefilled date/time |
| Duration | Not shown | Visual duration blocks in week/day view |
| Multiple calendars | No | Lists as toggleable calendars |
| Filtering | None | Priority, label, energy, context, completion |
| Recurring tasks | Not shown | Expanded occurrences displayed |
| Mobile | Same dense grid | Responsive agenda view |
| Unscheduled tasks | Not accessible | Drag-from-tray to schedule |
| Keyboard shortcuts | None | Scoped calendar shortcuts |
| Theme support | Manual CSS | Automatic via CSS var mapping |
