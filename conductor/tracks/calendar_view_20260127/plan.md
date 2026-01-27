# Implementation Plan - Calendar View Feature

## Phase 1: Foundation & Data Layer
- [ ] Task: Update Schema for View Preferences
    - [ ] Add `calendarViewType` (month/week) to `viewSettings` or `users` table
- [ ] Task: Create Server Actions for Calendar Data
    - [ ] Implement `getTasksByDateRange` action to fetch tasks for a specific month/week
- [ ] Task: Conductor - User Manual Verification 'Phase 1: Foundation & Data Layer' (Protocol in workflow.md)

## Phase 2: Core Calendar UI
- [ ] Task: Create Base Calendar Grid Component
    - [ ] Write unit tests for date calculation logic (respecting `weekStartsOnMonday`)
    - [ ] Implement month grid layout using CSS Grid
- [ ] Task: Add Navigation & View Toggles
    - [ ] Implement Prev/Next/Today controls
    - [ ] Implement Month/Week toggle with persistence
- [ ] Task: Conductor - User Manual Verification 'Phase 2: Core Calendar UI' (Protocol in workflow.md)

## Phase 3: Task Integration & Drag-and-Drop
- [ ] Task: Render Tasks in Calendar Cells
    - [ ] Map tasks to their respective dates in the grid
    - [ ] Ensure completed tasks are styled correctly
- [ ] Task: Implement Drag-and-Drop Rescheduling
    - [ ] Integrate `@dnd-kit` for moving tasks between cells
    - [ ] Implement optimistic UI update for date changes
- [ ] Task: Conductor - User Manual Verification 'Phase 3: Task Integration & Drag-and-Drop' (Protocol in workflow.md)

## Phase 4: Mobile Optimization & Final Polish
- [ ] Task: Responsive Calendar Layout
    - [ ] Implement mobile-friendly week view or list-toggle
- [ ] Task: Quick Add from Calendar
    - [ ] Implement click-on-cell to open pre-filled `TaskDialog`
- [ ] Task: Conductor - User Manual Verification 'Phase 4: Mobile Optimization & Final Polish' (Protocol in workflow.md)
