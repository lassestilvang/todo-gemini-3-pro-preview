## 2025-02-12 - Expand Time Tracker Widget Button
**Learning:** Found a missing `aria-label` and `focus-visible` styles on the button used to expand the compact time tracker widget. Screen reader users would have received insufficient context about the button's action, and keyboard users lacked visual feedback.
**Action:** Added `aria-label="Expand time tracker"` and `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to ensure proper accessibility and keyboard navigation for the widget toggle.
