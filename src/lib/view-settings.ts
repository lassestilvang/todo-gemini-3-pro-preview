/**
 * View Settings Types
 * 
 * Defines the structure for per-view customization settings.
 */

export interface ViewSettings {
    layout: "list" | "board" | "calendar";
    showCompleted: boolean;
    groupBy: "none" | "dueDate" | "priority" | "label";
    sortBy: "manual" | "dueDate" | "priority" | "name";
    sortOrder: "asc" | "desc";
    filterDate: "all" | "hasDate" | "noDate";
    filterPriority: string | null;
    filterLabelId: number | null;
    filterEnergyLevel: "high" | "medium" | "low" | null;
    filterContext: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | null;
}

export const defaultViewSettings: ViewSettings = {
    layout: "list",
    showCompleted: true,
    groupBy: "none",
    sortBy: "manual",
    sortOrder: "asc",
    filterDate: "all",
    filterPriority: null,
    filterLabelId: null,
    filterEnergyLevel: null,
    filterContext: null,
};

/**
 * Generate a view ID for a given view type and optional ID
 */
export function getViewId(viewType: string, id?: number | string): string {
    if (id !== undefined) {
        return `${viewType}-${id}`;
    }
    return viewType;
}
