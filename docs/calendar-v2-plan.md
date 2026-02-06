# Calendar V2 — Implementation Plan

> **Route:** `/calendar2`  
> **Library:** [FullCalendar v7](https://fullcalendar.io) with native shadcn integration  
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
12. [Server Actions](#12-server-actions)
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

The shadcn integration means every button, popover, and surface automatically inherits the app's design system — including glassmorphism, synthwave, and performance themes.

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

### 3.1 Install FullCalendar v7 via shadcn Registry

The shadcn integration is the recommended approach — it generates components that inherit the app's design tokens automatically.

```bash
# Add the FullCalendar shadcn registry to components.json
# Then install the event calendar component
npx shadcn@latest add @fullcalendar-monarch/event-calendar
```

This will scaffold:
- `src/components/event-calendar.tsx` — A pre-configured FullCalendar component
- `src/components/event-calendar-demo.tsx` — Demo (delete after setup)

The Monarch flavor aligns well with shadcn's `new-york` style.

### 3.2 Additional Dependencies

```bash
bun add temporal-polyfill    # Required peer dependency for FC v7
bun add rrule                # For recurring task expansion (if not already present)
```

### 3.3 Update `components.json`

```jsonc
{
  "registries": {
    "@fullcalendar-monarch": "https://shadcn-registry.fullcalendar.io/monarch/{name}.json"
  }
}
```

---

## 4. Data Model: Task → Event Mapping

### 4.1 Mapping Function

A pure function that converts the app's `Task` type into FullCalendar's `EventInput`:

```typescript
// src/components/calendar2/utils/task-to-event.ts

import type { Task } from "@/lib/types";
import type { EventInput } from "@fullcalendar/react";

export function taskToEvent(task: Task): EventInput | null {
  if (!task.dueDate) return null;

  const hasTime = hasTimeComponent(task.dueDate);
  const isAllDay = !hasTime;

  return {
    id: `task:${task.id}`,
    title: task.icon ? `${task.icon} ${task.title}` : task.title,
    start: task.dueDate,
    end: hasTime && task.estimateMinutes
      ? addMinutes(task.dueDate, task.estimateMinutes)
      : undefined,
    allDay: isAllDay,
    backgroundColor: task.listColor || undefined,
    borderColor: task.listColor || undefined,
    classNames: [
      task.isCompleted ? "calendar-event-completed" : "",
      `priority-${task.priority || "none"}`,
    ].filter(Boolean),
    extendedProps: {
      taskId: task.id,
      listId: task.listId,
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
    },
  };
}
```

### 4.2 Key Design Decisions

| Scenario | Behavior |
|----------|----------|
| Task has dueDate with time + estimateMinutes | Timed event with visible duration block |
| Task has dueDate with time, no estimate | Timed event, default 30min duration |
| Task has dueDate (date-only, midnight) | All-day event in month/week header |
| Task has no dueDate | Not shown on calendar; appears in "Unscheduled" tray |
| Task is completed | Shown with reduced opacity + strikethrough, toggleable via filter |
| Task has deadline | Small deadline indicator (⚠️) on event chip |

### 4.3 Time Zone Rule

- Dates stored as UTC timestamps in the database
- FullCalendar renders in the user's local timezone by default
- "Date-only" detection: if hours/minutes/seconds are all 0, treat as all-day

---

## 5. Multiple Calendars (Lists as Event Sources)

### 5.1 Concept

Each **List** in the app maps to a separate "calendar" with its own color and toggle. This mirrors Google Calendar's multi-calendar model.

### 5.2 Event Sources

Instead of passing a flat `events` array, use FullCalendar's `eventSources` — one per list plus one for "No List" (Inbox) tasks:

```typescript
const eventSources = useMemo(() => {
  const sources: EventSourceInput[] = [];

  // One source per visible list
  for (const list of lists) {
    if (!visibleListIds.has(list.id)) continue;
    sources.push({
      id: `list:${list.id}`,
      events: getEventsForList(list.id, filters),
      color: list.color || "hsl(var(--primary))",
    });
  }

  // Inbox (tasks with no list)
  if (visibleListIds.has(0)) {
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

In the Calendar Sidebar, render each list with:
- A **colored checkbox** (matching list color)
- The **list icon** and **name**
- A **task count** badge
- An "**All on/off**" master toggle at the top

Toggling a list instantly shows/hides its events on the calendar.

---

## 6. Core Interactions

### 6.1 Drag-and-Drop Rescheduling

```typescript
const handleEventDrop = async (info: EventDropArg) => {
  const taskId = info.event.extendedProps.taskId;
  const newDueDate = info.event.start;
  const wasAllDay = info.oldEvent.allDay;
  const isNowAllDay = info.event.allDay;

  // Optimistic update in Zustand store
  taskStore.updateTask(taskId, { dueDate: newDueDate });

  const result = await updateTaskSchedule(taskId, userId, {
    dueDate: newDueDate,
  });

  if (!result.success) {
    info.revert(); // FullCalendar reverts the visual change
    toast.error("Failed to reschedule task");
  } else {
    toast.success("Task rescheduled");
  }
};
```

**Edge cases handled:**
- Month → Month (date change only, stay all-day)
- Month → Week/Day time slot (gains specific time)
- Week/Day → Month (becomes all-day)
- Cross-list drag: also update `listId` if dropped on a different calendar source

### 6.2 Resize to Change Duration

```typescript
const handleEventResize = async (info: EventResizeArg) => {
  const taskId = info.event.extendedProps.taskId;
  const start = info.event.start!;
  const end = info.event.end!;
  const estimateMinutes = Math.round((end.getTime() - start.getTime()) / 60000);

  taskStore.updateTask(taskId, { estimateMinutes });

  const result = await updateTaskSchedule(taskId, userId, { estimateMinutes });

  if (!result.success) {
    info.revert();
    toast.error("Failed to update duration");
  }
};
```

### 6.3 Click-to-Create

**Month view — `dateClick`:**
- Opens `CalendarQuickCreateDialog` with dueDate prefilled (all-day)
- User enters title, optionally picks list/priority
- Submit creates task and it appears on calendar

**Week/Day view — `select` (drag to create):**
- User drags across a time range
- Opens `CalendarQuickCreateDialog` with:
  - `dueDate` = selection start
  - `estimateMinutes` = selection duration
- Provides a richer creation experience with time already set

### 6.4 Event Click → Detail Panel

```typescript
const handleEventClick = (info: EventClickArg) => {
  const taskId = info.event.extendedProps.taskId;
  setSelectedTaskId(taskId);
  setDetailPanelOpen(true);
};
```

The detail panel shows:
- Task title (editable inline)
- Completion checkbox
- Due date & time picker
- Duration/estimate
- List selector
- Priority selector
- Labels
- Description (expandable)
- "Open full details" link to TaskDialog
- Delete button

### 6.5 Right-Click Context Menu

Using shadcn's `ContextMenu` component on calendar events:

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

A small month grid in the calendar sidebar. Clicking a day calls `calendarApi.gotoDate(date)`. The current view's date range is highlighted, providing spatial awareness of which dates are visible.

Uses the existing `Calendar` UI primitive from `src/components/ui/calendar.tsx` (react-day-picker) — already respects `weekStartsOn` user preference.

### 7.2 Unscheduled Tasks Tray (Power Feature)

A collapsible section at the bottom of the calendar sidebar showing tasks **without a dueDate**:

- Displays as a compact scrollable list with priority colors
- **Drag from tray → calendar** to schedule a task (sets dueDate)
- Filter by list (only show tasks from visible lists)
- Count badge shows number of unscheduled tasks

This is a standout feature that bridges the gap between task management and calendar scheduling — most todo apps lack this.

**Implementation:** Use FullCalendar's [External Dragging](https://fullcalendar.io/docs/external-dragging) API with `Draggable` from the interaction plugin.

### 7.3 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `T` | Jump to today |
| `←` / `→` | Navigate prev / next period |
| `M` | Switch to month view |
| `W` | Switch to week view |
| `D` | Switch to day view |
| `A` | Switch to agenda (list) view |
| `N` | Open quick create dialog |
| `Esc` | Close detail panel / dialog |
| `F` | Toggle filter sidebar |
| `?` | Show keyboard shortcut help |

Scoped to the calendar page via a `useEffect` key listener that checks `document.activeElement` to avoid conflicts with input fields.

### 7.4 Agenda/List View

FullCalendar v7 includes a `listWeek` / `listMonth` plugin that renders events as a vertical scrollable agenda. This is:
- The **default on mobile** (replacing the dense grid)
- Available as a 4th view option in the toolbar
- Shows events grouped by day with full task details

### 7.5 Today Indicator & Now Line

- In week/day views: a red horizontal line showing the current time
- Auto-scrolls to "now" when switching to week/day view
- The "Today" button in the toolbar gets a subtle badge/dot when viewing a different date range

### 7.6 Smart Event Colors

Events inherit their **list color** as the primary color, with visual modifiers:

| State | Visual Treatment |
|-------|-----------------|
| Incomplete, no priority | List color at full opacity |
| Incomplete, high priority | List color + red left border accent |
| Incomplete, medium priority | List color + yellow left border accent |
| Incomplete, low priority | List color + blue left border accent |
| Completed | Muted/gray, reduced opacity, strikethrough title |
| Has deadline approaching | Small ⚠️ icon in event chip |
| Overdue | Red background tint |
| Recurring | Small 🔄 icon |

### 7.7 Quick Add from Toolbar

A persistent "+" button in the calendar toolbar for creating tasks without clicking a time slot. Opens a minimal form:
- Title (autofocus, press Enter to save)
- Date defaults to the currently viewed date
- List defaults to Inbox

---

## 8. Calendar Settings & Persistence

### 8.1 Calendar-Specific Settings

Extend the existing `ViewSettings` system using `getViewId("calendar2")`:

```typescript
interface CalendarViewSettings {
  // Calendar-specific
  viewType: "dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek";
  visibleListIds: number[]; // Which lists/calendars are shown
  showWeekends: boolean;
  showCompletedTasks: boolean;
  slotMinTime: string;      // e.g., "06:00:00"
  slotMaxTime: string;      // e.g., "22:00:00"
  slotDuration: string;     // e.g., "00:30:00" or "01:00:00"
  sidebarCollapsed: boolean;
  detailPanelCollapsed: boolean;

  // Filters
  filterPriority: string | null;
  filterLabelId: number | null;
  filterEnergyLevel: string | null;
  filterContext: string | null;
}
```

### 8.2 Persistence Approach

Store as a JSON string in the existing `view_settings` table using the `calendarSettings` field pattern:

- **View ID:** `"calendar2"`
- **On change:** Debounced save (500ms) to avoid excessive writes during rapid navigation
- **Default settings:** Month view, all lists visible, weekends shown, completed tasks hidden, 06:00–22:00 time range

### 8.3 Settings UI

A settings popover in the calendar toolbar (gear icon) with:
- Show weekends toggle
- Show completed tasks toggle
- Time range slider (business hours start/end)
- Slot duration selector (15m / 30m / 1h)
- Reset to defaults button

---

## 9. Theme & Dark Mode Integration

### 9.1 Dark Mode

FullCalendar v7 supports dark mode via `data-color-scheme="dark"` attribute. Wrap the calendar container:

```tsx
<div data-color-scheme={resolvedTheme === "dark" ? "dark" : "light"}>
  <FullCalendar ... />
</div>
```

The shadcn integration automatically maps `--background`, `--foreground`, `--primary`, etc. to FullCalendar's internal variables.

### 9.2 Theme-Specific Handling

| Theme | Calendar Behavior |
|-------|-------------------|
| Light / Dark | Standard shadcn color inheritance |
| Glassmorphism | Semi-transparent calendar background; `backdrop-blur` on the container |
| Synthwave | Calendar surfaces use synthwave color tokens; neon accent on today/events |
| Performance | Disable all FullCalendar transitions; set `rerenderDelay: 0`; skip animation classes |

### 9.3 Custom Event Styling

Use `eventContent` to render a custom React component for each event, styled with Tailwind classes that respect CSS variables:

```tsx
function CalendarEventContent({ event, timeText }: EventContentArg) {
  const { priority, isCompleted, listColor } = event.extendedProps;

  return (
    <div className={cn(
      "flex items-center gap-1 px-1 py-0.5 text-xs truncate rounded",
      isCompleted && "opacity-50 line-through"
    )}>
      {timeText && <span className="font-medium">{timeText}</span>}
      <span className="truncate">{event.title}</span>
    </div>
  );
}
```

---

## 10. Performance Strategy

### 10.1 Range-Based Event Loading

Do NOT pass all tasks to FullCalendar. Use the `events` function callback per event source to filter by the visible date range:

```typescript
events: (fetchInfo, successCallback) => {
  const filtered = tasks.filter(task =>
    task.dueDate &&
    task.dueDate >= fetchInfo.start &&
    task.dueDate < fetchInfo.end &&
    task.listId === listId
  );
  successCallback(filtered.map(taskToEvent));
}
```

### 10.2 Memoization

- Memoize event sources by `(visibleListIds, filters, taskStoreVersion)`
- Memoize the `taskToEvent` mapping with a `useMemo` that depends on the task store snapshot
- Use `React.memo` on the event content renderer

### 10.3 Large Dataset Optimizations

| Technique | Benefit |
|-----------|---------|
| `dayMaxEvents: 4` with "+N more" popover | Prevents rendering 100+ events on a single day cell |
| `eventDisplay: "block"` in month view | Simpler rendering than `"auto"` |
| Native `title` tooltips on dense days | Avoid mounting shadcn `Tooltip` per event |
| `lazyFetching: true` | Only refetch when the view date range changes |
| Debounced filter changes | Avoid re-rendering on every keystroke |

### 10.4 Dynamic Import

Load FullCalendar client-side only (it needs DOM):

```typescript
const Calendar2Client = dynamic(
  () => import("@/components/calendar2/Calendar2Client"),
  { ssr: false, loading: () => <CalendarSkeleton /> }
);
```

---

## 11. Recurring Tasks

### 11.1 V1 Approach: Read-Only Expansion

For the initial release, handle recurring tasks as **display-only expanded occurrences**:

1. Parse `recurringRule` (RRule string) using the `rrule` library
2. Expand occurrences within the visible date range
3. Render each occurrence as an event with a 🔄 badge
4. Each occurrence links back to the parent task

### 11.2 Interaction Restrictions

- **Drag/resize recurring events:** Disabled with a tooltip: "Editing individual occurrences of recurring tasks is not yet supported. Edit the task directly to change the schedule."
- **Click:** Opens the parent task in the detail panel with the recurring rule displayed
- **Context menu:** Limited to "Open Task" and "Mark Complete" (for the specific occurrence)

### 11.3 Future: Exception Model (V2)

If/when needed, add a `task_recurrence_exceptions` table:
```sql
CREATE TABLE task_recurrence_exceptions (
  id SERIAL PRIMARY KEY,
  task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  original_date TIMESTAMP NOT NULL,
  new_date TIMESTAMP,
  is_cancelled BOOLEAN DEFAULT false,
  override_title TEXT,
  override_estimate INTEGER
);
```

This allows editing or deleting individual occurrences without modifying the base rule.

---

## 12. Server Actions

### 12.1 New Action: `updateTaskSchedule`

A lightweight, focused action optimized for calendar drag/drop operations:

```typescript
// src/lib/actions/tasks.ts
"use server";

export async function updateTaskSchedule(
  taskId: number,
  userId: string,
  data: {
    dueDate?: Date | null;
    estimateMinutes?: number | null;
    listId?: number | null;
  }
): Promise<ActionResult<void>> {
  // 1. Verify task ownership
  // 2. Validate listId belongs to user (if provided)
  // 3. Validate estimateMinutes bounds (0–1440)
  // 4. Update only provided fields + updatedAt
  // 5. Revalidate paths
}
```

### 12.2 Existing Actions (No Changes Needed)

| Action | Usage in Calendar |
|--------|-------------------|
| `createTask` | Click-to-create with dueDate, estimateMinutes, listId |
| `updateTask` | Full edits from the detail panel |
| `updateTaskSafe` | Safe wrapper for client-side mutations |
| `toggleTaskComplete` | Completion checkbox in detail panel & context menu |
| `deleteTask` | Delete from context menu |

### 12.3 Optimistic Updates Pattern

All calendar interactions follow this pattern:

1. **Immediate visual feedback** — FullCalendar updates the event position
2. **Zustand store update** — Local state reflects the change
3. **Server action call** — Persist to database
4. **On failure** — Call `info.revert()` + revert Zustand + show error toast

---

## 13. Mobile & Responsive Design

### 13.1 Layout Breakpoints

| Breakpoint | Layout |
|------------|--------|
| Desktop (≥1024px) | Full 3-pane: sidebar + calendar + detail panel |
| Tablet (768–1023px) | 2-pane: calendar + sidebar as overlay Sheet |
| Mobile (<768px) | Single pane: agenda/list view default; sidebar via hamburger |

### 13.2 Mobile-Specific Behaviors

- **Default view:** `listWeek` (agenda) instead of month grid
- **Event tap:** Opens a bottom Sheet with task details (not a side panel)
- **Create:** FAB (floating action button) for quick task creation
- **Navigation:** Swipe left/right for prev/next (FullCalendar supports touch)
- **Calendar sidebar:** Full-screen overlay triggered by filter icon

### 13.3 Touch Interactions

- **Long-press to drag** (native FullCalendar behavior on touch)
- **Tap** to view details
- **Pinch-to-zoom** time slots in week/day view (if supported by FC v7)

---

## 14. Testing Strategy

### 14.1 Unit Tests

```
src/components/calendar2/utils/task-to-event.test.ts
```

- Test all mapping scenarios (with/without time, with/without estimate, completed, overdue, recurring)
- Test filter logic for list visibility and priority filters
- Test settings serialization/deserialization

### 14.2 Integration Tests

```
src/test/integration/calendar-schedule.test.ts
```

- `updateTaskSchedule` action: verify dueDate/estimateMinutes updates
- Authorization: user cannot reschedule another user's tasks
- Validation: estimateMinutes bounds, invalid listId

### 14.3 E2E Tests

```
e2e/calendar-v2.spec.ts
```

| Test | Description |
|------|-------------|
| Navigation | Month/Week/Day/Agenda view switching |
| Event display | Tasks with due dates appear on correct days |
| Drag-and-drop | Reschedule a task by dragging to a new date |
| Click-to-create | Create a task by clicking a date |
| List toggles | Hiding a list removes its events |
| Completion | Toggle task completion from calendar |
| Responsive | Agenda view on mobile viewport |

---

## 15. File Structure

```
src/
├── app/
│   └── calendar2/
│       └── page.tsx                         # RSC entry point
│
├── components/
│   └── calendar2/
│       ├── Calendar2Client.tsx              # Main client component
│       ├── CalendarMain.tsx                 # FullCalendar wrapper
│       ├── CalendarToolbar.tsx              # Custom toolbar (views, nav, settings)
│       ├── CalendarEventContent.tsx         # Custom event renderer
│       ├── CalendarSidebar.tsx              # Left sidebar container
│       │
│       ├── sidebar/
│       │   ├── MiniMonthPicker.tsx          # Jump-to-date mini calendar
│       │   ├── CalendarListToggles.tsx      # List visibility checkboxes
│       │   ├── CalendarFilters.tsx          # Priority, label, energy filters
│       │   └── UnscheduledTasksTray.tsx     # Drag-to-schedule tray
│       │
│       ├── CalendarDetailPanel.tsx          # Right panel for task details
│       ├── CalendarQuickCreateDialog.tsx    # Task creation from time slot
│       ├── CalendarContextMenu.tsx          # Right-click menu
│       ├── CalendarSettingsPopover.tsx      # Gear icon settings
│       │
│       └── utils/
│           ├── task-to-event.ts             # Task → EventInput mapping
│           ├── task-to-event.test.ts        # Unit tests
│           ├── calendar-settings.ts         # Settings type & defaults
│           └── recurring-expander.ts        # RRule → occurrences
│
└── lib/
    └── actions/
        └── tasks.ts                         # Add updateTaskSchedule action
```

---

## 16. Implementation Phases

### Phase 1: Foundation (Core Calendar) ⏱️ ~4-6h

1. Install FullCalendar v7 via shadcn registry + dependencies
2. Create `/calendar2` route with auth
3. Build `Calendar2Client` with FullCalendar rendering tasks from Zustand store
4. Implement `taskToEvent` mapping function with tests
5. Add month/week/day/agenda view switching
6. Add navigation (prev/next/today)
7. Add sidebar navigation entry
8. Wire up dark mode via `data-color-scheme`

**Milestone:** Tasks with due dates are visible on the calendar in all 4 views.

### Phase 2: Interactions ⏱️ ~3-4h

1. Enable drag-and-drop rescheduling with `updateTaskSchedule` action
2. Enable resize to change duration
3. Implement click-to-create / drag-to-create with `CalendarQuickCreateDialog`
4. Add event click → detail panel with quick edit
5. Add right-click context menu
6. Add optimistic updates with rollback

**Milestone:** Full CRUD interaction — create, reschedule, resize, edit, complete, delete from calendar.

### Phase 3: Multi-Calendar & Filters ⏱️ ~2-3h

1. Implement event sources per list
2. Build `CalendarListToggles` with colored checkboxes
3. Build `CalendarFilters` (priority, label, energy, context)
4. Implement show/hide completed tasks toggle
5. Wire up filter persistence to ViewSettings

**Milestone:** Users can toggle list visibility and filter events like Google Calendar.

### Phase 4: Enhanced UX ⏱️ ~3-4h

1. Build `MiniMonthPicker` with date range highlighting
2. Build `UnscheduledTasksTray` with external drag support
3. Add keyboard shortcuts
4. Add smart event colors (priority borders, overdue tint, completion styling)
5. Add recurring task display (read-only expansion)
6. Add `CalendarSettingsPopover` (weekends, time range, slot duration)

**Milestone:** Power-user features complete — keyboard nav, unscheduled tray, recurring display.

### Phase 5: Polish & Testing ⏱️ ~2-3h

1. Mobile/responsive layout with agenda default
2. Theme integration testing (glassmorphism, synthwave, performance)
3. Performance optimization (dayMaxEvents, memoization, lazy loading)
4. Write E2E tests
5. Persist all settings
6. Accessibility audit (ARIA labels, focus management, keyboard navigation)

**Milestone:** Production-ready, tested, performant across all themes and devices.

---

## 17. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| FullCalendar v7 is in beta | Breaking changes possible | Pin to specific `@beta` version; isolate FC in wrapper component |
| Time zone ambiguity (date-only vs timed) | Events appear on wrong days | Clear rule: midnight UTC = all-day; any other time = timed event |
| Recurring task editing complexity | Data integrity issues | V1: read-only display of occurrences; series editing only via TaskDialog |
| Performance with 5000+ tasks | Calendar becomes sluggish | Range-based filtering, `dayMaxEvents`, memoized event sources |
| shadcn registry not fully stable for FC v7 | Installation issues | Fallback: manual React integration with stock theme + CSS var mapping |
| Mobile drag-and-drop UX | Difficult on small screens | Default to agenda view on mobile; long-press hint tooltip |
| Optimistic update conflicts | Stale data after offline sync | Use Zustand store version + `updatedAt` for conflict detection; revert on mismatch |

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
| Keyboard shortcuts | None | Full keyboard navigation |
| Performance | Custom, fast | FullCalendar with range-based loading |
| Theme support | Manual CSS | Automatic via shadcn integration |
