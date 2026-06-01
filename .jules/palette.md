## 2024-05-14 - [Added Tooltips to Icon-Only Filter Badges]
**Learning:** Icon-only buttons (like `X` to remove filters) within complex badge components often lack tooltips, leaving sighted users without context for what the button does until they click it.
**Action:** Use the `Tooltip` component (wrapping `TooltipTrigger asChild` around the `button`) for all icon-only action buttons to improve visual accessibility, ensuring it does not break flexbox layouts.
