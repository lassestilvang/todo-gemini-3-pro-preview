## 2024-05-15 - Missing Accessible Names on Icon-only Buttons
**Learning:** Found multiple instances where `size="icon"` buttons were created using Lucide React icons, but no text or `aria-label` was provided. This means screen reader users would hear an unlabelled button without context.
**Action:** Always verify that `size="icon"` components include an `aria-label` or visually hidden text when creating or refactoring buttons.
