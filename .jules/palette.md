## 2024-05-30 - Added Explicit Label Associations to Custom Inputs
**Learning:** For custom inputs (like Radix UI Select triggers or standard textareas), using a semantic <label> without an htmlFor attribute fails to associate the label with the input. This prevents screen readers from announcing the label when the input receives focus and prevents the browser from transferring focus when the label is clicked.
**Action:** When building or modifying custom form controls, always generate a unique ID (e.g., using React.useId()) and pass it to the input/trigger, then link the <label> using htmlFor. Adding a cursor-pointer class to the label provides immediate visual feedback that it is interactive.

## 2024-05-14 - [Added Tooltips to Icon-Only Filter Badges]
**Learning:** Icon-only buttons (like "X" to remove filters) within complex badge components often lack tooltips, leaving sighted users without context for what the button does until they click it.
**Action:** Use the Tooltip component (wrapping TooltipTrigger asChild around the button) for all icon-only action buttons to improve visual accessibility, ensuring it does not break flexbox layouts.

## 2026-06-03 - Always set type="button" on custom action buttons
**Learning:** Custom UI action buttons (like those used for filter removal or timer modes) can inadvertently cause form submissions or full-page reloads if they lack a `type` attribute, as the default HTML behavior for `<button>` is `type="submit"`.
**Action:** Always explicitly specify `type="button"` on custom `<button>` elements that act as standalone UI controls, unless they are intentionally designed to submit a form.
