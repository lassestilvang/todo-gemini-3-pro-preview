## 2024-03-20 - Ensure Visibility of Custom Interactive Elements via Focus Rings
**Learning:** This application heavily utilizes `role="button"` on non-semantic generic container elements like `div` elements (e.g., in `CalendarView.tsx`, `TaskBoardCard.tsx`, and `CalendarSidebar.tsx`) to implement highly custom interactive components while providing custom logic and styles for active and hover states. When relying solely on hover styles, keyboard users and assistive technology fail to receive adequate visual feedback of focus state, compromising accessibility. Default browser focus outlines are sometimes overridden or unreliable on generic container elements relying on `tabIndex={0}`.
**Action:** Always append explicit `focus-visible` Tailwind classes (such as `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`) whenever attaching a custom `role="button"` or raw `tabIndex` to elements instead of solely relying on pointer-based hover styles or expecting the browser to provide a consistent default ring.

## 2024-04-11 - Add focus-visible styles to absolutely positioned buttons
**Learning:** absolutely positioned inline `<button>` elements (such as the "Add task" `+` icons on calendar grids) often have their native browser focus rings clipped, omitted, or otherwise not styled by default in this application.
**Action:** When building or modifying such absolutely positioned `<button>` icons, I must append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` classes to ensure keyboard navigation remains visibly accessible.

## 2024-04-13 - Add focus-visible styles to custom tabIndex Tooltip triggers
**Learning:** In components like `TaskItem.tsx`, custom inline tooltip triggers are sometimes built using non-interactive elements like `div` by setting `tabIndex={0}`. While this enables focusability for screen readers, these elements often lack default browser focus indicators, rendering them invisible to keyboard users.
**Action:** When creating or modifying custom `tabIndex={0}` elements (such as `div` or `span` used for Tooltip triggers), explicitly append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm` to ensure proper visual feedback during keyboard navigation.

## 2024-04-14 - Keyboard accessibility on custom interactive buttons
**Learning:** Custom interactive elements like absolutely positioned buttons or inline toggle buttons often lose their native focus ring styling due to custom layout rules or overflow clipping, making them invisible to keyboard users navigating via Tab.
**Action:** Consistently append explicitly defined focus utility classes (such as outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:ring-offset-2) to all custom or absolutely positioned <button> components to guarantee visible focus states across different device contexts.
