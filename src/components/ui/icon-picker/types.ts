
export const RECENT_ICONS_KEY = "todo-gemini-recent-icons";
export const MAX_RECENTS = 18;

export const COMMON_COLORS = [
    "#ef4444", // Red
    "#f97316", // Orange
    "#eab308", // Yellow
    "#22c55e", // Green
    "#06b6d4", // Cyan
    "#3b82f6", // Blue
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#64748b", // Slate
    "#000000", // Black
] as const;

export type LibraryItem = {
    type: "emoji" | "custom";
    value: string; // The char for emoji, or url for custom
    name: string; // For filtering
    id?: number; // Only for custom
};

export type IconPickerState = {
    open: boolean;
    searchQuery: string;
    activeTab: string;
    selectedColor: string | null;
    customIcons: LibraryItem[];
    uploadName: string;
    uploadUrl: string;
    isUploading: boolean;
    isLoading: boolean;
    recentIcons: string[];
    isDragging: boolean;
};

export type IconPickerAction =
    | { type: 'SET_OPEN'; payload: boolean }
    | { type: 'SET_SEARCH_QUERY'; payload: string }
    | { type: 'SET_ACTIVE_TAB'; payload: string }
    | { type: 'SET_SELECTED_COLOR'; payload: string | null }
    | { type: 'SET_CUSTOM_ICONS'; payload: LibraryItem[] }
    | { type: 'ADD_CUSTOM_ICON'; payload: LibraryItem }
    | { type: 'SET_UPLOAD_NAME'; payload: string }
    | { type: 'SET_UPLOAD_URL'; payload: string }
    | { type: 'SET_IS_UPLOADING'; payload: boolean }
    | { type: 'SET_IS_LOADING'; payload: boolean }
    | { type: 'SET_RECENT_ICONS'; payload: string[] }
    | { type: 'SET_IS_DRAGGING'; payload: boolean }
    | { type: 'RESET_UPLOAD' };

export function readRecentIconsFromStorage() {
    if (typeof window === "undefined") return [] as string[];
    const saved = localStorage.getItem(RECENT_ICONS_KEY);
    if (!saved || !saved.startsWith("[")) return [] as string[];

    try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
    } catch (error) {
        console.error("Failed to parse recent icons", error);
        return [] as string[];
    }
}
