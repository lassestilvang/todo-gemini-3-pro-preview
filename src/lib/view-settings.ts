/**
 * View Settings Types
 * 
 * Defines the structure for per-view customization settings.
 */

export interface ViewSettings {
    layout: "list" | "board" | "calendar";
    showCompleted: boolean;
    groupBy: "none" | "dueDate" | "priority" | "label" | "list" | "estimate";
    sortBy: "manual" | "dueDate" | "priority" | "name" | "created";
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

export function mapDbSettingsToViewSettings(dbSettings: { layout?: string; showCompleted?: boolean; groupBy?: string; sortBy?: string; sortOrder?: string; compactMode?: boolean } | null): ViewSettings {
    if (!dbSettings) return defaultViewSettings;

    return {
        layout: (dbSettings.layout as ViewSettings["layout"]) || defaultViewSettings.layout,
        showCompleted: dbSettings.showCompleted ?? defaultViewSettings.showCompleted,
        groupBy: (dbSettings.groupBy as ViewSettings["groupBy"]) || defaultViewSettings.groupBy,
        sortBy: (dbSettings.sortBy as ViewSettings["sortBy"]) || defaultViewSettings.sortBy,
        sortOrder: (dbSettings.sortOrder as ViewSettings["sortOrder"]) || defaultViewSettings.sortOrder,
        filterDate: (dbSettings.filterDate as ViewSettings["filterDate"]) || defaultViewSettings.filterDate,
        filterPriority: dbSettings.filterPriority || defaultViewSettings.filterPriority,
        filterLabelId: dbSettings.filterLabelId || defaultViewSettings.filterLabelId,
        filterEnergyLevel: (dbSettings.filterEnergyLevel as ViewSettings["filterEnergyLevel"]) || defaultViewSettings.filterEnergyLevel,
        filterContext: (dbSettings.filterContext as ViewSettings["filterContext"]) || defaultViewSettings.filterContext,
    };
}
