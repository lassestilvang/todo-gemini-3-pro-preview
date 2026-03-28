## 2024-05-24 - [Floating Action Button Accessibility]
**Learning:** Floating action buttons (FABs) that open generic custom popovers often lack native `dialog` semantics. Screen readers need a clear programmatic link between the toggle button and the floating panel.
**Action:** When implementing custom popovers triggered by FABs, always pair `aria-expanded` and `aria-controls` on the button with `role="dialog"`, `id`, and `aria-labelledby` on the floating container to establish a semantic relationship.

## 2025-03-22 - Missing Loading State for Dialog Submissions
**Learning:** Found that list and label creation dialogs (`ManageListDialog`, `ManageLabelDialog`) disabled their submit buttons during async actions (`isSaving`/`isLoading`) but lacked visual feedback indicating a background process was occurring, leaving the UI feeling temporarily frozen.
**Action:** Always include a visual loading indicator (like `Loader2 animate-spin`) next to or inside the submit button when transitioning it to a disabled state during asynchronous saves to improve immediate user feedback.

## 2025-03-22 - Missing Focus Indicators on Custom Tab Buttons
**Learning:** Found that custom tab elements built using `<button>` tags (like the mode toggles in the Pomodoro timer) lacked `focus-visible` styles, making keyboard navigation difficult as users could not visually identify which tab they were currently focused on.
**Action:** When creating custom tab buttons with `<button role="tab">`, always include explicit `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background` classes to ensure proper keyboard accessibility feedback.

## 2024-03-24 - Icon Picker Image Buttons Missing ARIA Labels
**Learning:** Icon-only buttons used for selection in dynamic grids (like "Recently Used" or "My Icons") often rely on images without providing accessible names. Screen readers announce these as generic buttons, making it impossible for visually impaired users to know which icon they are selecting.
**Action:** Always add `aria-label` attributes describing the specific icon (e.g., `aria-label={"Select custom icon " + c.name}`) when rendering grids of icon or image buttons.

## 2025-03-24 - Search Input Clear Buttons Missing ARIA Labels
**Learning:** Found that the clear button (`<X />`) in the main search input was missing an `aria-label`. Without this, screen readers might just announce "button" or the generic icon name instead of the action ("Clear search query"). Users relying on screen readers wouldn't know what this button does.
**Action:** Always provide an explicit `aria-label` (e.g., `aria-label="Clear search query"`) for icon-only buttons like clear/reset actions within form inputs.

## 2025-03-28 - Add Explicit ARIA Labels to Custom Select Triggers
**Learning:** Screen readers may fail to announce the purpose of custom UI select components (like those in shadcn/ui) if the visual label is disconnected from the trigger itself or if the placeholder text disappears upon selection.
**Action:** Always provide an explicit `aria-label` attribute directly to `<SelectTrigger>` elements to ensure the field's purpose remains clearly conveyed, even when an external `<span>` acts as its visual label.
