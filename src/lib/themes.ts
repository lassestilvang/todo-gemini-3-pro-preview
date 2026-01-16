/**
 * Single source of truth for all available application themes.
 * Adding a theme here will automatically:
 * 1. Register it with the ThemeProvider in RootLayout.
 * 2. Update the visual regression test suite.
 * 3. Appear in the ThemeSwitcher settings UI.
 */
export const AVAILABLE_THEMES = [
    "light",
    "dark",
    "glassmorphism",
    "glassmorphism-dark",
    "neubrutalism",
    "minimalist",
    "synthwave",
    "system",
] as const;

export type AppTheme = (typeof AVAILABLE_THEMES)[number];

/**
 * Theme metadata for UI display in ThemeSwitcher.
 * Each theme in AVAILABLE_THEMES should have corresponding metadata here.
 */
export const THEME_METADATA: Record<AppTheme, {
    label: string;
    description: string;
    previewColor: string;
}> = {
    light: {
        label: "Light",
        description: "Default light mode",
        previewColor: "bg-white border-gray-200",
    },
    dark: {
        label: "Dark",
        description: "Default dark mode",
        previewColor: "bg-slate-950 border-slate-800",
    },
    glassmorphism: {
        label: "Glassmorphism",
        description: "Dreamy, frosted glass effect",
        previewColor: "bg-purple-900/50 border-white/20 backdrop-blur-md",
    },
    "glassmorphism-dark": {
        label: "Glassmorphism Dark",
        description: "Sleek frosted glass on deep dark",
        previewColor: "bg-slate-950/80 border-cyan-400/30 backdrop-blur-md",
    },
    neubrutalism: {
        label: "Neubrutalism",
        description: "Bold, high contrast, pop style",
        previewColor: "bg-[#f3f4f6] border-black border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]",
    },
    minimalist: {
        label: "Minimalist",
        description: "Clean, focused, zen",
        previewColor: "bg-[#fafafa] border-gray-100",
    },
    synthwave: {
        label: "Synthwave",
        description: "Neon-soaked retro future",
        previewColor: "bg-slate-950 border-purple-500 shadow-[0_0_10px_#a855f7]",
    },
    system: {
        label: "System",
        description: "Follows system preference",
        previewColor: "bg-gradient-to-br from-white to-slate-950 border-gray-400",
    },
};
