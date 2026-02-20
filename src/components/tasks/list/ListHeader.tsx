
import React from "react";
import { ViewOptionsPopover } from "../ViewOptionsPopover";
import { ViewSettings } from "@/lib/view-settings";

interface ListHeaderProps {
    title?: string;
    viewId: string;
    userId?: string;
    viewIndicator: string | null;
    settings: ViewSettings;
    onSettingsChange: (settings: ViewSettings) => void;
}

export function ListHeader({
    title, viewId, userId, viewIndicator, settings, onSettingsChange
}: ListHeaderProps) {
    return (
        <div className="flex items-center justify-between">
            {title && <h2 className="text-xl font-semibold">{title}</h2>}
            <div className="flex items-center gap-2 ml-auto">
                {viewIndicator && (
                    <span className="text-xs text-muted-foreground font-medium animate-in fade-in slide-in-from-right-2 duration-300">
                        {viewIndicator}
                    </span>
                )}
                <ViewOptionsPopover
                    viewId={viewId}
                    userId={userId}
                    settings={settings}
                    onSettingsChange={onSettingsChange}
                />
            </div>
        </div>
    );
}
