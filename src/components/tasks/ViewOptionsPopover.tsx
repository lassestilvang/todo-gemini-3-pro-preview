
"use client";

import React, { useEffect, useTransition, useReducer } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Settings2, RotateCcw } from "lucide-react";
import { ViewSettings, defaultViewSettings } from "@/lib/view-settings";
import { saveViewSettings, resetViewSettings } from "@/lib/actions/view-settings";
import { getLabels } from "@/lib/actions/labels";
import { createSavedView } from "@/lib/actions/views";
import { toast } from "sonner";
import { useIsClient } from "@/hooks/use-is-client";

// Extracted Components
import { LayoutSection } from "./view-options/LayoutSection";
import { SortSection } from "./view-options/SortSection";
import { FilterSection } from "./view-options/FilterSection";
import { SaveAsViewSection } from "./view-options/SaveAsViewSection";

interface ViewOptionsPopoverProps {
    viewId: string;
    userId?: string;
    settings?: ViewSettings;
    onSettingsChange?: (settings: ViewSettings) => void;
}

type UIState = {
    open: boolean;
    sortExpanded: boolean;
    filterExpanded: boolean;
    labels: Array<{ id: number; name: string; color: string | null }>;
    viewName: string;
    isSaving: boolean;
};

type UIAction =
    | { type: "SET_OPEN"; payload: boolean }
    | { type: "TOGGLE_SORT_EXPANDED" }
    | { type: "TOGGLE_FILTER_EXPANDED" }
    | { type: "SET_LABELS"; payload: UIState["labels"] }
    | { type: "SET_VIEW_NAME"; payload: string }
    | { type: "SET_IS_SAVING"; payload: boolean };

function uiReducer(state: UIState, action: UIAction): UIState {
    switch (action.type) {
        case "SET_OPEN": return { ...state, open: action.payload };
        case "TOGGLE_SORT_EXPANDED": return { ...state, sortExpanded: !state.sortExpanded };
        case "TOGGLE_FILTER_EXPANDED": return { ...state, filterExpanded: !state.filterExpanded };
        case "SET_LABELS": return { ...state, labels: action.payload };
        case "SET_VIEW_NAME": return { ...state, viewName: action.payload };
        case "SET_IS_SAVING": return { ...state, isSaving: action.payload };
        default: return state;
    }
}

export function ViewOptionsPopover({ viewId, userId, settings: propSettings, onSettingsChange }: ViewOptionsPopoverProps) {
    const settings = propSettings || defaultViewSettings;
    const [isPending, startTransition] = useTransition();
    const isClient = useIsClient();

    const [uiState, dispatchUI] = useReducer(uiReducer, {
        open: false,
        sortExpanded: true,
        filterExpanded: true,
        labels: [],
        viewName: "",
        isSaving: false,
    });

    const { open, sortExpanded, filterExpanded, labels, viewName, isSaving } = uiState;

    useEffect(() => {
        if (!userId) return;
        getLabels(userId).then(l => dispatchUI({ type: "SET_LABELS", payload: l }));
    }, [userId]);

    const updateSetting = <K extends keyof ViewSettings>(key: K, value: ViewSettings[K]) => {
        const newSettings = { ...settings, [key]: value };
        startTransition(async () => {
            if (userId) await saveViewSettings(userId, viewId, { [key]: value });
            onSettingsChange?.(newSettings);
        });
    };

    const handleReset = () => {
        onSettingsChange?.(defaultViewSettings);
        startTransition(async () => {
            if (!userId) return;
            try {
                await resetViewSettings(userId, viewId);
            } catch {
                onSettingsChange?.(settings);
                toast.error("Failed to reset view settings");
            }
        });
    };

    const handleSaveAsView = async () => {
        if (!userId || !viewName.trim()) return;
        dispatchUI({ type: "SET_IS_SAVING", payload: true });
        const result = await createSavedView({ userId, name: viewName.trim(), settings: JSON.stringify(settings) }).catch(() => null);
        if (result?.success) {
            toast.success(`View "${viewName}" saved!`);
            dispatchUI({ type: "SET_VIEW_NAME", payload: "" });
            dispatchUI({ type: "SET_OPEN", payload: false });
        } else {
            toast.error("Failed to save view");
        }
        dispatchUI({ type: "SET_IS_SAVING", payload: false });
    };

    if (!isClient) {
        return <Button variant="outline" size="sm" className="gap-2" disabled><Settings2 className="h-4 w-4" />View</Button>;
    }

    return (
        <Popover open={open} onOpenChange={v => dispatchUI({ type: "SET_OPEN", payload: v })}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2"><Settings2 className="h-4 w-4" />View</Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 space-y-4">
                    <LayoutSection layout={settings.layout} onUpdate={v => updateSetting("layout", v)} />

                    <div className="flex items-center justify-between">
                        <span className="text-sm">Completed tasks</span>
                        <Switch checked={settings.showCompleted} onCheckedChange={v => updateSetting("showCompleted", v)} />
                    </div>

                    <Separator />
                    <SortSection
                        viewId={viewId} groupBy={settings.groupBy} sortBy={settings.sortBy}
                        expanded={sortExpanded} onToggle={() => dispatchUI({ type: "TOGGLE_SORT_EXPANDED" })}
                        onUpdate={updateSetting}
                    />

                    <Separator />
                    <FilterSection
                        settings={settings} labels={labels}
                        expanded={filterExpanded} onToggle={() => dispatchUI({ type: "TOGGLE_FILTER_EXPANDED" })}
                        onUpdate={updateSetting}
                    />

                    <Separator />
                    <SaveAsViewSection
                        viewName={viewName} isSaving={isSaving}
                        onViewNameChange={v => dispatchUI({ type: "SET_VIEW_NAME", payload: v })}
                        onSave={handleSaveAsView}
                    />

                    <Separator />
                    <Button variant="ghost" className="w-full text-destructive hover:text-destructive" onClick={handleReset} disabled={isPending}>
                        <RotateCcw className="h-4 w-4 mr-2" />Reset all
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
