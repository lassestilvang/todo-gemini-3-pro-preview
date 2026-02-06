# Calendar V2 — Implementation Plan (Revised for FullCalendar v7 beta)

> **Route:** `/calendar2` (beta)  \
> **Library:** FullCalendar v7 **beta** (required)  \
> **Goal:** Replace the current read-only month grid with a best-in-class interactive calendar rivaling Google Calendar and Fantastical

---

## Progress

- [x] Install FullCalendar v7 beta + temporal polyfill
- [x] Add `/calendar2` route and sidebar link
- [x] Build core Calendar2 client shell (sidebar + calendar)
- [x] Drag-and-drop rescheduling
- [x] Resize to change task duration
- [x] Click date to create task (TaskDialog)
- [x] Multiple calendars (lists as event sources with toggles)
- [ ] Persist calendar-specific settings in `view_settings`
- [ ] Filters (priority/labels/energy/context)
- [ ] Recurring expansion (read-only)
- [ ] E2E coverage

---

## Table of Contents

1. [Overview & Vision](#1-overview--vision)
2. [Architecture](#2-architecture)
3. [Installation & Setup (FullCalendar v7 beta)](#3-installation--setup-fullcalendar-v7-beta)
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
- **Create** tasks by clicking on a date or time slot
- **Toggle** list visibility like separate calendars (Google Calendar style)
- **Navigate** with keyboard shortcuts for power users (later)

**Route strategy:** `/calendar2` is a beta route. The existing `/calendar` remains untouched.

**Time semantics:** timestamps are stored without timezone in the DB. FullCalendar renders in the user’s local timezone. A due date at midnight is treated as **all-day**.

---

## 2. Architecture

### 2.1 Page Layout — 3-Pane Design (initial: 2 panes)

```
┌─────────────────────────────────────────────────────┐
│  App Sidebar (existing)                             │
├──────────┬──────────────────────────┬───────────────┤
│ Calendar │                          │  Detail       │
│ Sidebar  │   FullCalendar Main      │  Panel        │
│          │                          │  (optional)   │
│ • List   │   Month / Week / Day     │               │
│   Toggle │                          │               │
└──────────┴──────────────────────────┴───────────────┘
```

- **Calendar Sidebar** (left): List toggles (multiple calendars)
- **Main Area**: FullCalendar with toolbar (view switcher, navigation, today button)
- **Detail Panel**: optional in a later phase
- **Data loading:** `/calendar2` server component prefetches tasks + lists and passes them to the client as a fallback until the client stores hydrate.

### 2.2 Component Hierarchy

```
src/app/calendar2/page.tsx              (RSC — auth)
└── Calendar2Client.tsx                 (client, no SSR)
    ├── CalendarSidebar.tsx             (list toggles)
    ├── CalendarMain.tsx                (FullCalendar wrapper)
    └── CalendarQuickCreateDialog.tsx   (TaskDialog wrapper)
```

---

## 3. Installation & Setup (FullCalendar v7 beta)

**Install guide:** https://raw.githubusercontent.com/fullcalendar/fullcalendar-docs/refs/heads/v7/INSTALL-GUIDE.md

### 3.1 Required Packages

FullCalendar v7 beta uses the React standard package and a Temporal polyfill:

```bash
bun add @fullcalendar/react@beta temporal-polyfill
```

### 3.2 Plugin Imports (v7)

Plugins are imported from `@fullcalendar/react/*` paths:

```ts
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import interactionPlugin from "@fullcalendar/react/interaction";
```

### 3.3 Theme + CSS Imports (v7)

We use the **classic** theme for a neutral baseline:

```ts
import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/classic/theme.css";
import "@fullcalendar/react/themes/classic/palette.css";
import classicTheme from "@fullcalendar/react/themes/classic";
```

Then include `classicTheme` in the `plugins` array.

---

## 4. Data Model: Task → Event Mapping

### 4.1 Mapping Function

```typescript
// src/components/calendar2/utils/task-to-event.ts

export function taskToEvent(task: Task): EventInput | null {
  if (!task.dueDate) return null;

  const hasTime = hasTimeComponent(task.dueDate);
  const isAllDay = !hasTime;

  return {
    id: `task:${task.id}`,
    title: task.icon ? `${task.icon} ${task.title}` : task.title,
    start: task.dueDate,
    end: !isAllDay && task.estimateMinutes
      ? addMinutes(task.dueDate, task.estimateMinutes)
      : undefined,
    allDay: isAllDay,
    backgroundColor: task.listColor || undefined,
    borderColor: task.listColor || undefined,
    extendedProps: {
      taskId: task.id,
      listId: task.listId,
      updatedAt: task.updatedAt,
      // ...other task props
    },
  };
}
```

**Note:** tasks may have `Date | string` values; normalize as needed.

### 4.2 Key Design Decisions

| Scenario | Behavior |
|----------|----------|
| Task has dueDate with time + estimateMinutes | Timed event with duration block |
| Task has dueDate with time, no estimate | Timed event with default duration (via `defaultTimedEventDuration`) |
| Task has dueDate (date-only, midnight) | All-day event in month/week header |
| Task has no dueDate | Not shown on calendar |

---

## 5. Multiple Calendars (Lists as Event Sources)

Each list is a calendar with its own toggle. Inbox is `listId: null`.

```typescript
// Current implementation: build a filtered events array based on visible list IDs.
const events = useMemo(() => {
  return tasks
    .filter(task => task.dueDate && visibleListIds.has(task.listId ?? null))
    .map(taskToEvent)
    .filter(Boolean);
}, [tasks, visibleListIds]);

// Future optimization: switch to eventSources for range-based fetching.
```

---

## 6. Core Interactions

### 6.1 Drag-and-Drop Rescheduling

- Enable `editable: true`
- On drop, update store optimistically and enqueue `updateTask` via `SyncProvider`

### 6.2 Resize to Change Duration

- Enable `eventResizableFromStart`
- Compute `estimateMinutes` from resized start/end
- Dispatch `updateTask`

### 6.3 Click-to-Create

- `dateClick` opens TaskDialog with `defaultDueDate`
- `select` (drag) does the same with time-based start

---

## 7. Enhanced UX Features (Planned)

- Mini month navigator
- Unscheduled tasks tray (drag to schedule)
- Keyboard shortcuts (scoped)
- Context menu for quick actions

---

## 8. Calendar Settings & Persistence (Planned)

Add calendar-specific columns to `view_settings`:

- `calendar_view_type`
- `calendar_visible_list_ids` (JSON string)
- `calendar_show_weekends`
- `calendar_slot_min_time`
- `calendar_slot_max_time`
- `calendar_slot_duration`
- `calendar_sidebar_collapsed`
- `calendar_detail_panel_collapsed`

---

## 9. Theme & Dark Mode Integration

Use `data-color-scheme` on the calendar container and rely on CSS variables for theme alignment.

---

## 10. Performance Strategy

- Range-based filtering inside `events` callback
- Memoized event sources
- `dayMaxEvents` to limit heavy days

---

## 11. Recurring Tasks (Planned)

Read-only expansion of occurrences within visible range. Editing individual occurrences is out of scope for V1.

---

## 12. Server Actions & Offline Sync

Use existing actions via `SyncProvider`:

- `createTask`
- `updateTask`
- `toggleTaskCompletion`
- `deleteTask`

---

## 13. Mobile & Responsive Design (Planned)

- Collapse sidebar into overlay
- Default to agenda view on mobile (future)

---

## 14. Testing Strategy (Planned)

- Unit: mapping + filters
- Integration: drag/resize updateTask
- E2E: view switching + create/drag

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
│       ├── CalendarSidebar.tsx
│       ├── CalendarQuickCreateDialog.tsx
│       └── utils/
│           └── task-to-event.ts
```

---

## 16. Implementation Phases

### Phase 1: Foundation (Done)
1. Install FullCalendar v7 beta + temporal polyfill
2. Create `/calendar2` route with auth
3. Build `Calendar2Client` with FullCalendar rendering tasks
4. Add month/week/day view switching

### Phase 2: Interactions (Done)
1. Drag-and-drop rescheduling
2. Resize to change duration
3. Click-to-create task

### Phase 3: Multi-Calendar (Done)
1. Event sources per list + Inbox
2. List visibility toggles

### Phase 4: Persistence + UX (Planned)
1. Persist calendar settings in `view_settings`
2. Filters
3. Unscheduled tray
4. Keyboard shortcuts

### Phase 5: Testing + Polish (Planned)
1. E2E tests
2. Responsive improvements
3. Accessibility audit

---

## 17. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| FullCalendar v7 beta changes | Breaking updates | Pin beta version; isolate in wrapper |
| Time semantics ambiguity | Events render on wrong day | Clear rule: midnight = all‑day |
| Offline conflicts | Stale UI | SyncProvider conflict dialog |
