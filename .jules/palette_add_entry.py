entry = """
## 2024-07-10 - Provide tooltips for custom icon-only action buttons in full-screen overlays
**Learning:** Icon-only action buttons (like those used for timers or full-screen focus modes) lack context when presented without tooltips. The `aria-label` helps screen reader users, but sighted users need immediate visual feedback to understand the button's action, especially in distraction-free interfaces where standard UI context is hidden.
**Action:** Always wrap custom icon-only `<Button>` components (like Reset, Pause/Play, Minimize) with the application's `<Tooltip>` component (using `<TooltipTrigger asChild>`) to ensure immediate, accessible feedback for all users.
"""

# Read and rewrite to fix the formatting
with open(".jules/palette.md", "r") as f:
    content = f.read()
    content = content.replace("The \\`aria-label\\`", "The `aria-label`")

with open(".jules/palette.md", "w") as f:
    f.write(content)

with open(".jules/palette.md", "a") as f:
    f.write(entry)
