# Palette's Journal

## 2024-05-22 - Invisible Focus States
**Learning:** Using `opacity-0` with `group-hover:opacity-100` completely hides interactive elements from keyboard users, creating a "ghost" tab stop where focus disappears.
**Action:** Always pair `opacity-0` + `hover:opacity-100` with `focus:opacity-100` to ensure keyboard accessibility.

## 2024-05-22 - Clickable Rows vs Interactive Children
**Learning:** Making an entire table row clickable (`onClick` on div) is inaccessible to keyboard users, preventing them from accessing the primary action (e.g., Edit) if the row also contains other interactive elements (checkboxes).
**Action:** Always provide a dedicated, focusable button (e.g., "Edit" icon) for the primary row action to ensure keyboard accessibility.
