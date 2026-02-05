# Palette's Journal

## 2024-05-22 - Invisible Focus States
**Learning:** Using `opacity-0` with `group-hover:opacity-100` completely hides interactive elements from keyboard users, creating a "ghost" tab stop where focus disappears.
**Action:** Always pair `opacity-0` + `hover:opacity-100` with `focus:opacity-100` to ensure keyboard accessibility.

## 2024-05-22 - Clickable Rows vs Interactive Children
**Learning:** Making an entire table row clickable (`onClick` on div) is inaccessible to keyboard users, preventing them from accessing the primary action (e.g., Edit) if the row also contains other interactive elements (checkboxes).
**Action:** Always provide a dedicated, focusable button (e.g., "Edit" icon) for the primary row action to ensure keyboard accessibility.

## 2024-05-23 - Contextual Empty States
**Learning:** Generic "No items" empty states fail to guide users or explain *why* a list is empty. Users might think it's an error or feel lost.
**Action:** Use context-aware empty states (e.g., "All caught up!" for Inbox vs "No completed tasks yet" for History) with relevant icons to provide clarity and delight.

## 2025-02-18 - Timer Accessibility
**Learning:** Adding `aria-live="polite"` to a second-by-second countdown timer floods screen readers with constant updates, making the rest of the page unusable.
**Action:** Use `role="timer"` without `aria-live` for frequently updating timers, or only announce major milestones.

## 2024-05-23 - Contextual Empty States
**Learning:** Generic "No items" empty states fail to guide users or explain *why* a list is empty. Users might think it's an error or feel lost.
**Action:** Use context-aware empty states (e.g., "All caught up!" for Inbox vs "No completed tasks yet" for History) with relevant icons to provide clarity and delight.

## 2024-05-23 - Contextual Empty States
**Learning:** Generic "No items" empty states fail to guide users or explain *why* a list is empty. Users might think it's an error or feel lost.
**Action:** Use context-aware empty states (e.g., "All caught up!" for Inbox vs "No completed tasks yet" for History) with relevant icons to provide clarity and delight.

## 2024-05-24 - Affordance Mismatch
**Learning:** Elements styled with `cursor-pointer` must be interactive. Users interpret the pointer cursor as a promise of clickability. If clicking does nothing, trust is eroded.
**Action:** Only apply `cursor-pointer` when an `onClick` handler is present, or ensure the element is a functional link/button.

## 2024-05-24 - Drag-and-Drop Accessibility
**Learning:** In `dnd-kit`, splitting `attributes` (wrapper) and `listeners` (handle) breaks keyboard accessibility because the focusable element (wrapper) lacks the event listeners to trigger drag.
**Action:** Ensure `listeners` and `attributes` are applied to the *same* element (the handle), or pass `listeners` to the wrapper if the whole item is the handle.

## 2024-05-24 - Relative Dates and Hydration
**Learning:** Rendering relative dates like "Today" directly during SSR causes hydration mismatches when server and client timezones differ.
**Action:** Always gate relative date formatting with a `mounted` check to ensure the client re-renders with the correct local time.

