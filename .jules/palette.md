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

## 2024-05-24 - Relative Dates and Hydration
**Learning:** Rendering relative dates like "Today" directly during SSR causes hydration mismatches when server and client timezones differ.
**Action:** Always gate relative date formatting with a `mounted` check to ensure the client re-renders with the correct local time.
