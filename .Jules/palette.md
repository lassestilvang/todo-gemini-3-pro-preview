## 2024-05-24 - [Floating Action Button Accessibility]
**Learning:** Floating action buttons (FABs) that open generic custom popovers often lack native `dialog` semantics. Screen readers need a clear programmatic link between the toggle button and the floating panel.
**Action:** When implementing custom popovers triggered by FABs, always pair `aria-expanded` and `aria-controls` on the button with `role="dialog"`, `id`, and `aria-labelledby` on the floating container to establish a semantic relationship.
