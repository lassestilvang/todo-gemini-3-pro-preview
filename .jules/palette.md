## 2024-05-30 - Added Explicit Label Associations to Custom Inputs
**Learning:** For custom inputs (like Radix UI Select triggers or standard textareas), using a semantic <label> without an htmlFor attribute fails to associate the label with the input. This prevents screen readers from announcing the label when the input receives focus and prevents the browser from transferring focus when the label is clicked.
**Action:** When building or modifying custom form controls, always generate a unique ID (e.g., using React.useId()) and pass it to the input/trigger, then link the <label> using htmlFor. Adding a cursor-pointer class to the label provides immediate visual feedback that it is interactive.

## 2024-05-14 - [Added Tooltips to Icon-Only Filter Badges]
**Learning:** Icon-only buttons (like "X" to remove filters) within complex badge components often lack tooltips, leaving sighted users without context for what the button does until they click it.
**Action:** Use the Tooltip component (wrapping TooltipTrigger asChild around the button) for all icon-only action buttons to improve visual accessibility, ensuring it does not break flexbox layouts.

## 2024-06-05 - Avoid using aria-labelledby with un-IDed elements
**Learning:** Using `aria-labelledby` inside mapping loops while providing the targeted ID to an element, but forgetting to actually define the `id` on that target element breaks screen readers.
**Action:** Always verify that an `id` actually exists for elements that use `aria-labelledby`, or prefer wrapping `label htmlFor` natively when working with Radix UI to allow Radix UI to manage associations.
