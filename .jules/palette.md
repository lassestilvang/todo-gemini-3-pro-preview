## 2025-02-18 - Mobile Accessibility of Icon-Only Buttons
**Learning:** Buttons containing only an icon and text wrapped in `hidden sm:inline` are inaccessible on mobile devices because screen readers ignore content with `display: none` (implied by `hidden`).
**Action:** Always add `aria-label` to buttons that might be icon-only on smaller breakpoints, ensuring the label matches the hidden text.
