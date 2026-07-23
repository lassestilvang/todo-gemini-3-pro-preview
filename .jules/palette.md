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

## 2024-06-13 - [Use Custom Tooltips over Native title for Icon-only buttons]
**Learning:** Using the native HTML `title` attribute for tooltips on icon-only action buttons results in an inconsistent visual experience, delayed appearance, and potential accessibility issues for keyboard users.
**Action:** Replace native `title` attributes on icon-only buttons with the application's design system `<Tooltip>` component (wrapping `<TooltipTrigger asChild>`) to ensure immediate, visually consistent, and accessible feedback while maintaining the `aria-label` attribute on the button itself.
## 2024-05-14 - Explicit `type="button"` for custom buttons
**Learning:** Found multiple instances where custom UI buttons (specifically in the `icon-picker` tabs) were missing the explicit `type="button"` attribute. In HTML, the default type for `<button>` is `"submit"`. If these components are ever reused or nested inside a `<form>` element, clicking them will inadvertently submit the form and cause a disruptive page reload.
**Action:** Always explicitly set `type="button"` on custom action buttons that are not intended to submit forms.

## 2024-06-07 - Always set type="button" on sidebar toggle buttons
**Learning:** Custom toggle buttons inside layout components (like `SlimSidebar`) used to expand or hide sidebars often lack the `type="button"` attribute. Since the default HTML behavior is `type="submit"`, this can cause unintended form submissions if the component is nested near a form context.
**Action:** Always explicitly specify `type="button"` on all custom UI action buttons, including layout toggles and expansible triggers, to ensure safe and predictable interactions.
## 2024-07-09 - Accessible Descriptions for Non-interactive UI elements
**Learning:** Native title attributes on div or span elements provide delayed feedback and are completely inaccessible to keyboard-only users who cannot hover. However, adding tabIndex={0} to non-interactive elements to trigger tooltips creates confusing tab stops for keyboard users.
**Action:** Use visually hidden text (e.g., using a .sr-only class) to provide accessible descriptions for screen readers, and avoid adding tabIndex={0} or tooltips to non-interactive elements.

## 2024-07-08 - Use Tooltips instead of native title for status indicators
**Learning:** Using native HTML `title` attributes on status indicators (like Daily Streak or Streak Freezes) results in inconsistent, delayed visual feedback, and poor accessibility for keyboard users compared to custom tooltips.
**Action:** Replace native `title` attributes on non-interactive informational elements with the application's `<Tooltip>` component to ensure immediate, consistent, and accessible feedback.

## 2024-07-10 - Provide tooltips for custom icon-only action buttons in full-screen overlays
**Learning:** Icon-only action buttons (like those used for timers or full-screen focus modes) lack context when presented without tooltips. The `aria-label` helps screen reader users, but sighted users need immediate visual feedback to understand the button's action, especially in distraction-free interfaces where standard UI context is hidden.
**Action:** Always wrap custom icon-only \`<Button>\` components (like Reset, Pause/Play, Minimize) with the application's \`<Tooltip>\` component (using \`<TooltipTrigger asChild>\`) to ensure immediate, accessible feedback for all users.

## 2024-07-10 - Provide tooltips for custom icon-only action buttons in full-screen overlays
**Learning:** Icon-only action buttons (like those used for timers or full-screen focus modes) lack context when presented without tooltips. The `aria-label` helps screen reader users, but sighted users need immediate visual feedback to understand the button's action, especially in distraction-free interfaces where standard UI context is hidden.
**Action:** Always wrap custom icon-only `<Button>` components (like Reset, Pause/Play, Minimize) with the application's `<Tooltip>` component (using `<TooltipTrigger asChild>`) to ensure immediate, accessible feedback for all users.

## 2024-07-26 - Double tooltips and missing button types
**Learning:** Found multiple instances where buttons used native `title` attributes despite already being wrapped in custom `<Tooltip>` components, causing a disruptive double-tooltip experience. Additionally, several custom action buttons lacked `type="button"`.
**Action:** Always verify that native `title` attributes are removed when introducing custom tooltips to an element, and explicitly set `type="button"` on all standalone UI action buttons to prevent accidental form submissions.
