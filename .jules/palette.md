## 2024-05-30 - Added Explicit Label Associations to Custom Inputs
**Learning:** For custom inputs (like Radix UI Select triggers or standard textareas), using a semantic <label> without an htmlFor attribute fails to associate the label with the input. This prevents screen readers from announcing the label when the input receives focus and prevents the browser from transferring focus when the label is clicked.
**Action:** When building or modifying custom form controls, always generate a unique ID (e.g., using React.useId()) and pass it to the input/trigger, then link the <label> using htmlFor. Adding a cursor-pointer class to the label provides immediate visual feedback that it is interactive.

## 2024-05-14 - [Added Tooltips to Icon-Only Filter Badges]
**Learning:** Icon-only buttons (like "X" to remove filters) within complex badge components often lack tooltips, leaving sighted users without context for what the button does until they click it.
**Action:** Use the Tooltip component (wrapping TooltipTrigger asChild around the button) for all icon-only action buttons to improve visual accessibility, ensuring it does not break flexbox layouts.

## 2026-06-03 - Always set type="button" on custom action buttons
**Learning:** Custom UI action buttons (like those used for filter removal or timer modes) can inadvertently cause form submissions or full-page reloads if they lack a `type` attribute, as the default HTML behavior for `<button>` is `type="submit"`.
**Action:** Always explicitly specify `type="button"` on custom `<button>` elements that act as standalone UI controls, unless they are intentionally designed to submit a form.
## 2024-06-05 - Avoid using aria-labelledby with un-IDed elements
**Learning:** Using `aria-labelledby` inside mapping loops while providing the targeted ID to an element, but forgetting to actually define the `id` on that target element breaks screen readers.
**Action:** Always verify that an `id` actually exists for elements that use `aria-labelledby`, or prefer wrapping `label htmlFor` natively when working with Radix UI to allow Radix UI to manage associations.
## 2024-06-04 - Wrap TemplateManager Action Buttons in Tooltip
**Learning:** Tooltips should wrap icon-only action buttons to improve UX and accessibility, ensuring users understand their purpose immediately.
**Action:** Always wrap icon-only `<Button>` elements with `<Tooltip>`, `<TooltipTrigger asChild>`, and `<TooltipContent>` to display their descriptive intent.

## 2024-06-05 - Safe ARIA Label Overrides
**Learning:** When creating wrapper components (like `CalendarDayButton` overriding `react-day-picker`'s `DayButton`), relying solely on `{...props}` to pass down `aria-label` can inadvertently drop the label if the wrapping component definition explicitly needs an `aria-label`. However, blindly adding an `aria-label` will overwrite any dynamic label passed from parent context.
**Action:** Always explicitly define `aria-label={props['aria-label'] || 'Fallback Context'}` to ensure custom components receive a sensible default screen reader announcement without clobbering dynamic overrides.
## 2024-06-06 - Always set aria-label on form inputs lacking explicit labels
**Learning:** Some custom UI elements (like textareas for subtasks) lack explicit `<label htmlFor="...">` associations or visually hidden labels. This leaves screen reader users without context when the field receives focus.
**Action:** When a `<label>` cannot be explicitly linked via `htmlFor`, or if the field lacks one entirely, always add an `aria-label` attribute directly to the `<Input>` or `<Textarea>` element to ensure full accessibility.

## 2024-06-11 - Always Add type="button" to Component Buttons
**Learning:** Action buttons in generic components (like Shadcn UI `<Button>`) will default to `type="submit"` if not explicitly specified. This can cause unintended form submissions or page reloads if the component is eventually embedded within a form.
**Action:** Always explicitly set `type="button"` on all custom action buttons that are not intended to submit a form.
