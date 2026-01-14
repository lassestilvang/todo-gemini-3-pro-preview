/**
 * Single source of truth for all available application themes.
 * Adding a theme here will automatically:
 * 1. Register it with the ThemeProvider in RootLayout.
 * 2. Update the visual regression test suite.
 */
export const AVAILABLE_THEMES = [
    "light",
    "dark",
    "glassmorphism",
    "neubrutalism",
    "minimalist",
] as const;

export type AppTheme = (typeof AVAILABLE_THEMES)[number];
