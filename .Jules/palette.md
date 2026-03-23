## 2024-05-24 - [Floating Action Button Accessibility]
**Learning:** Floating action buttons (FABs) that open generic custom popovers often lack native `dialog` semantics. Screen readers need a clear programmatic link between the toggle button and the floating panel.
**Action:** When implementing custom popovers triggered by FABs, always pair `aria-expanded` and `aria-controls` on the button with `role="dialog"`, `id`, and `aria-labelledby` on the floating container to establish a semantic relationship.

## 2025-03-22 - Missing Loading State for Dialog Submissions
**Learning:** Found that list and label creation dialogs (`ManageListDialog`, `ManageLabelDialog`) disabled their submit buttons during async actions (`isSaving`/`isLoading`) but lacked visual feedback indicating a background process was occurring, leaving the UI feeling temporarily frozen.
**Action:** Always include a visual loading indicator (like `Loader2 animate-spin`) next to or inside the submit button when transitioning it to a disabled state during asynchronous saves to improve immediate user feedback.

## 2025-03-22 - Missing Focus Indicators on Custom Tab Buttons
**Learning:** Found that custom tab elements built using `<button>` tags (like the mode toggles in the Pomodoro timer) lacked `focus-visible` styles, making keyboard navigation difficult as users could not visually identify which tab they were currently focused on.
**Action:** When creating custom tab buttons with `<button role="tab">`, always include explicit `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background` classes to ensure proper keyboard accessibility feedback.
