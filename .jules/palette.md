# Palette's Journal

## 2024-05-15 - Missing Accessible Names on Icon-only Buttons
**Learning:** Found multiple instances where `size="icon"` buttons were created using Lucide React icons, but no text or `aria-label` was provided. This means screen reader users would hear an unlabelled button without context.
**Action:** Always verify that `size="icon"` components include an `aria-label` or visually hidden text when creating or refactoring buttons.

## 2024-05-22 - Invisible Focus States
**Learning:** Using `opacity-0` with `group-hover:opacity-100` completely hides interactive elements from keyboard users, creating a "ghost" tab stop where focus disappears.
**Action:** Always pair `opacity-0` + `hover:opacity-100` with `focus:opacity-100` to ensure keyboard accessibility.

## 2024-05-22 - Clickable Rows vs Interactive Children
**Learning:** Making an entire table row clickable (`onClick` on div) is inaccessible to keyboard users, preventing them from accessing the primary action (e.g., Edit) if the row also contains other interactive elements (checkboxes).
**Action:** Always provide a dedicated, focusable button (e.g., "Edit" icon) for the primary row action to ensure keyboard accessibility.

## 2024-05-23 - Contextual Empty States
**Learning:** Generic "No items" empty states fail to guide users or explain *why* a list is empty. Users might think it's an error or feel lost.
**Action:** Use context-aware empty states (e.g., "All caught up!" for Inbox vs "No completed tasks yet" for History) with relevant icons to provide clarity and delight.

## 2025-02-18 - Timer Accessibility
**Learning:** Adding `aria-live="polite"` to a second-by-second countdown timer floods screen readers with constant updates, making the rest of the page unusable.
**Action:** Use `role="timer"` without `aria-live` for frequently updating timers, or only announce major milestones.

## 2024-05-24 - Affordance Mismatch
**Learning:** Elements styled with `cursor-pointer` must be interactive. Users interpret the pointer cursor as a promise of clickability. If clicking does nothing, trust is eroded.
**Action:** Only apply `cursor-pointer` when an `onClick` handler is present, or ensure the element is a functional link/button.

## 2024-05-24 - Drag-and-Drop Accessibility
**Learning:** In `dnd-kit`, splitting `attributes` (wrapper) and `listeners` (handle) breaks keyboard accessibility because the focusable element (wrapper) lacks the event listeners to trigger drag.
**Action:** Ensure `listeners` and `attributes` are applied to the *same* element (the handle), or pass `listeners` to the wrapper if the whole item is the handle.

## 2024-05-24 - Relative Dates and Hydration
**Learning:** Rendering relative dates like "Today" directly during SSR causes hydration mismatches when server and client timezones differ.
**Action:** Always gate relative date formatting with a `mounted` check to ensure the client re-renders with the correct local time.

## 2025-02-18 - Mobile Accessibility of Icon-Only Buttons
**Learning:** Buttons containing only an icon and text wrapped in `hidden sm:inline` are inaccessible on mobile devices because screen readers ignore content with `display: none` (implied by `hidden`).
**Action:** Always add `aria-label` to buttons that might be icon-only on smaller breakpoints, ensuring the label matches the hidden text.

## 2025-02-19 - Destructive Confirmation UX
**Learning:** Using native `window.confirm()` for destructive actions (like delete) creates a jarring experience and blocks the UI thread. It also fails to match the application's design language.
**Action:** Replace `confirm()` with a lightweight `Popover` or `AlertDialog` component containing a confirmation message and a secondary confirm button, ensuring the destructive action is deliberate and visually integrated.

## 2025-03-04 - Accessible Close Buttons
**Learning:** Icon-only close buttons (like the `X` icon on quick capture forms) are completely invisible to screen readers without an `aria-label` or `sr-only` text. This prevents users from understanding how to dismiss temporary UI elements.
**Action:** Always verify that buttons containing only an icon component (e.g., `<X className="h-4 w-4" />`) have a descriptive `aria-label` attribute (e.g., `aria-label="Close"`).

## 2024-05-24 - Subtask Row Clickability
**Learning:** A classic UX improvement is making entire rows clickable (Fitts's Law), not just the small checkbox. However, when using Radix UI Checkboxes inside a clickable row container, the `Checkbox` `onClick` handler must call `e.stopPropagation()` and explicitly `onCheckedChange()` to prevent the row's `onClick` from firing and causing a double-toggle. Also, the row text should use `select-none` so fast clicks don't highlight text accidentally.
**Action:** Always add `cursor-pointer`, `onClick`, and `select-none` to list rows, and ensure inner interactive elements stop propagation. Mock Radix Checkbox in tests if `happy-dom` acts up.
## 2025-03-02 - Added ARIA labels and focus states to filter clear buttons
**Learning:** Found that secondary/inline UI elements (like the 'X' button in filter badges) often lack `aria-label` text and visual focus indicators, especially when built manually rather than relying on standard Button components.
**Action:** When inspecting or adding icon-only inline controls (like delete, remove, close), proactively add a descriptive `aria-label` and `focus-visible` ring utilities (with `rounded-full` if circular) to ensure screen reader users have context and keyboard users can see where focus is.

## 2025-03-05 - Invisible Focus States
**Learning:** Elements styled with `opacity-0` that rely purely on `group-hover:opacity-100` remain invisible when focused by keyboard users, creating a frustrating experience.
**Action:** Consistently pair hover opacity classes with focus alternatives: use `focus:opacity-100 focus-visible:opacity-100` for the focusable element itself, or `group-focus-within:opacity-100` on the wrapper if you want siblings to appear on focus.

## 2025-03-07 - Pagination Button Accessibility
**Learning:** Found that pagination-style icon buttons (like 'Previous month' / 'Next month' in calendars) often lack accessible names, making it impossible for screen reader users to understand their function since they only contain decorative icons.
**Action:** When inspecting or adding navigation/pagination controls that only use icons (like `<ChevronLeft />` or `<ChevronRight />`), proactively add descriptive `aria-label` attributes to the wrapping `<Button>` component to provide clear semantic context.

## 2024-03-10 - Prefer aria-label on icon buttons over nested sr-only spans
**Learning:** Using `aria-label` directly on icon-only interactive elements (like `<Button size="icon">`) is generally cleaner and provides a stronger accessible name than nesting a `<span className="sr-only">`. Also, ensure consistency when `title` is used for sighted users, `aria-label` should also be present for screen readers.
**Action:** When creating icon-only buttons, directly use `aria-label` on the component and ensure it matches the `title` if present, instead of relying on a hidden span child.

## 2025-03-10 - Missing Focus Outlines on Custom Toggle Buttons
**Learning:** Custom interactive elements designed from scratch (like the custom task list period toggle section `<button>`) often lack explicit focus indicators, creating severe accessibility barriers for keyboard users who cannot see where their focus is. Standard UI components usually provide this out-of-the-box, but custom implementations require manual `focus-visible` classes.
**Action:** Always ensure custom `<button>` or interactive `<div>` implementations include standard focus-visible classes like `focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-ring` and an appropriate `rounded` utility so the focus ring aligns with the element's shape.

## 2024-03-12 - Missing aria-controls on subtask expand button
**Learning:** Found an accessibility issue pattern in the app where state-toggling buttons (like expanding/collapsing subtasks) had `aria-expanded` but were missing the corresponding `aria-controls` attribute linking them to the toggled container. This prevents screen readers from properly understanding what section is being controlled.
**Action:** When implementing expandable/collapsible sections, always pair `aria-expanded` on the button with `aria-controls` pointing to a unique `id` on the target container. Added `subtasks-${task.id}` to properly associate them.
## 2024-03-13 - Added ARIA label to IconPicker Shuffle button
**Learning:** Found an accessibility issue pattern where icon-only buttons (`<Button size="icon">`) without text content lack explicit `aria-label` attributes for screen readers, such as the Shuffle ("Random Icon") button in `src/components/ui/icon-picker.tsx`.
**Action:** Always provide an `aria-label` on icon-only buttons. When a tooltip is also required, use a `Tooltip` component instead of the `title` attribute to ensure a consistent and accessible experience.
## 2024-05-28 - Clean up sr-only Spans within Buttons
**Learning:** Adding a `span` with `sr-only` class inside a `<Button size="icon">` combined with other content (like icons) can sometimes be redundant or cause layout quirks, and is less semantic than applying the `aria-label` attribute directly to the parent interactive element. The standard accessibility pattern for icon-only buttons in this codebase should be to provide a direct `aria-label`.
**Action:** Replace `sr-only` text spans within buttons with an explicit `aria-label` attribute directly on the `Button` or `button` tag itself to provide robust context for screen readers and cleaner markup.
## 2024-05-17 - Color Picker Accessibility
**Learning:** Found that custom color picker components using raw `<button>` elements with `style={{ backgroundColor: c }}` lacked any accessible name, making them completely invisible to screen readers since they have no inner text or SVG with a title.
**Action:** Always add an explicit `aria-label` (e.g., `aria-label={\`Select color ${c}\`}`) to buttons that rely solely on CSS backgrounds or colors to convey their purpose.
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
**Action:** When a visible label exists (like an external `<span>`), prefer `aria-labelledby` to link it to the `<SelectTrigger>`. This avoids duplicating text and is more maintainable. Use `aria-label` as a fallback when no visible label is present.
## 2025-03-26 - Missing ARIA Labels on Preview Clear Buttons
**Learning:** Icon-only buttons used to remove or clear an uploaded image preview (like in `UploadTab.tsx`) often lack accessible names, preventing screen readers from announcing what the button does ("Remove uploaded image").
**Action:** Always add an `aria-label` (e.g. `aria-label="Remove uploaded image"`) to icon-only "clear" buttons inside file/image upload previews.

## 2025-04-03 - Contextual ARIA Labels for Generic List Actions
**Learning:** Buttons inside list items that perform an action (like "Use", "Edit", "Delete") often have visually generic text or just an icon. Without context, screen reader users navigating by buttons or tabbing through will only hear "Use button", without knowing which item it applies to.
**Action:** Always add an explicit, contextual `aria-label` (e.g., `aria-label={"Use template " + template.name}`) to action buttons inside lists to provide full context to assistive technologies.

## 2025-04-03 - Focus States for Absolute/Inline Buttons
**Learning:** Found that absolute positioned inline `<button>` elements inside input fields (like 'clear search' actions) often lack visual focus feedback, as default browser focus rings are frequently clipped or omitted in these layouts.
**Action:** Always append explicit focus-visible utility classes (e.g., `outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-full`) to ensure keyboard users receive clear visual feedback when tabbing to inline absolute buttons.
## 2025-05-01 - Missing Focus Outlines on Absolute Positioned Clear Buttons
**Learning:** Inline or absolute positioned clear/remove buttons (like 'X' inside search inputs or image upload previews) often lack visible focus indicators because they don't use standard `<Button>` components and the default browser outline is easily hidden or clipped.
**Action:** Always append explicit focus-visible classes (`focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50`) to absolute positioned interactive elements to ensure keyboard navigation visibility. For circular items on colored backgrounds, consider adding `focus-visible:ring-offset-2`.
## 2025-04-04 - Missing Focus Rings on Input Clear Buttons
**Learning:** Found that custom search inputs containing an inline `<button>` to clear the input text (like `FloatingSearchInput` or `SidebarSearchInput`) often lack explicit `focus-visible` styles. Because they are absolutely positioned over the input and typically only styled for hover states, keyboard users navigating out of the input to clear it won't see any visual focus indicator.
**Action:** When inspecting or adding icon-only inline controls (like clear buttons inside inputs), proactively add standard `focus-visible` utilities (e.g., `outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-md`) to ensure proper keyboard accessibility feedback.
## 2024-04-03 - Dynamic Context for Identical Action Buttons
**Learning:** Adding static `aria-label="Add task"` to dozens of identical buttons in a grid (like a calendar) forces screen reader users to guess which specific context (date) the button applies to when tabbing through.
**Action:** When mapping over items to generate interactive elements, dynamically inject the item's context into the `aria-label` (e.g., `aria-label={"Add task on " + day.toDateString()}`). This ensures each button is uniquely identifiable when accessed out-of-context.

## 2025-04-04 - Missing ARIA Labels and Focus Styles on Custom Syntax Shortcuts
**Learning:** Found that custom helper buttons inside `Badge` components (like the Smart Syntax shortcuts `!high`, `@work`) lack accessible names (`aria-label`) and explicit focus indicators. Screen readers fail to convey their purpose out of context, and keyboard users cannot easily determine which badge has focus.
**Action:** When implementing custom helper or syntax shortcut buttons inside components like `Badge` with `asChild`, ensure the nested `<button>` includes an explicit `aria-label` (e.g., `aria-label={"Insert smart syntax " + s}`). Furthermore, apply `focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1` on the parent `Badge` or standard focus styles on the button to guarantee keyboard navigation feedback.
