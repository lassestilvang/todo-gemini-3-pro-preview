## 2025-03-02 - Added ARIA labels and focus states to filter clear buttons
**Learning:** Found that secondary/inline UI elements (like the 'X' button in filter badges) often lack `aria-label` text and visual focus indicators, especially when built manually rather than relying on standard Button components.
**Action:** When inspecting or adding icon-only inline controls (like delete, remove, close), proactively add a descriptive `aria-label` and `focus-visible` ring utilities (with `rounded-full` if circular) to ensure screen reader users have context and keyboard users can see where focus is.
