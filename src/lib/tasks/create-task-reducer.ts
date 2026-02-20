
import { parseNaturalLanguage } from "@/lib/nlp-parser";

export type State = {
    title: string;
    dueDate: Date | undefined;
    dueDatePrecision: "day" | "week" | "month" | "year";
    dueDateSource: "default" | "nlp" | "manual" | "none";
    priority: "none" | "low" | "medium" | "high";
    energyLevel: "high" | "medium" | "low" | undefined;
    context: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | undefined;
    isExpanded: boolean;
    isAiLoading: boolean;
    isSubmitting: boolean;
    isDialogOpen: boolean;
    isCalendarOpen: boolean;
    isPriorityOpen: boolean;
    icon: string | undefined;
};

export type Action =
    | { type: "SET_TITLE"; payload: string; parsed?: ReturnType<typeof parseNaturalLanguage> }
    | { type: "SET_DUE_DATE"; payload: { date?: Date; source: "default" | "nlp" | "manual" | "none"; precision?: "day" | "week" | "month" | "year" } }
    | { type: "SET_PRIORITY"; payload: "none" | "low" | "medium" | "high" }
    | { type: "SET_ENERGY_LEVEL"; payload: "high" | "medium" | "low" | undefined }
    | { type: "SET_CONTEXT"; payload: "computer" | "phone" | "errands" | "meeting" | "home" | "anywhere" | undefined }
    | { type: "SET_UI_STATE"; payload: Partial<Pick<State, "isExpanded" | "isAiLoading" | "isSubmitting" | "isDialogOpen" | "isCalendarOpen" | "isPriorityOpen">> }
    | { type: "SET_ICON"; payload: string | undefined }
    | { type: "RESET"; payload?: { defaultDueDate?: Date | string } };

export function reducer(state: State, action: Action): State {
    switch (action.type) {
        case "SET_TITLE": {
            const updates: Partial<State> = { title: action.payload };
            if (action.parsed && action.payload.trim()) {
                const { priority, dueDate, dueDatePrecision, energyLevel, context } = action.parsed;
                if (priority && state.priority === "none") updates.priority = priority;
                if (dueDate && state.dueDateSource !== "manual") {
                    updates.dueDate = dueDate;
                    updates.dueDatePrecision = dueDatePrecision ?? "day";
                    updates.dueDateSource = "nlp";
                }
                if (energyLevel && !state.energyLevel) updates.energyLevel = energyLevel;
                if (context && !state.context) updates.context = context;
            }
            return { ...state, ...updates };
        }
        case "SET_DUE_DATE":
            return {
                ...state,
                dueDate: action.payload.date,
                dueDateSource: action.payload.source,
                dueDatePrecision: action.payload.precision ?? state.dueDatePrecision,
            };
        case "SET_PRIORITY":
            return { ...state, priority: action.payload };
        case "SET_ENERGY_LEVEL":
            return { ...state, energyLevel: action.payload };
        case "SET_CONTEXT":
            return { ...state, context: action.payload };
        case "SET_UI_STATE":
            return { ...state, ...action.payload };
        case "SET_ICON":
            return { ...state, icon: action.payload };
        case "RESET": {
            const defaultDueDate = action.payload?.defaultDueDate ? new Date(action.payload.defaultDueDate) : undefined;
            return {
                ...state,
                title: "",
                dueDate: defaultDueDate,
                dueDateSource: defaultDueDate ? "default" : "none",
                dueDatePrecision: "day",
                priority: "none",
                energyLevel: undefined,
                context: undefined,
                icon: undefined,
                isExpanded: false,
                isSubmitting: false,
            };
        }
        default:
            return state;
    }
}
