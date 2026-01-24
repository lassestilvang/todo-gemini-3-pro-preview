"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sunrise, Sunset, Sparkles, Moon } from "lucide-react";
import { PlanningRitual } from "@/components/tasks/PlanningRitual";
import { SmartScheduleDialog } from "@/components/tasks/SmartScheduleDialog";
import { useZenMode } from "@/components/providers/ZenModeProvider";
import { RescheduleButton } from "@/components/tasks/RescheduleButton";

export function SidebarRituals() {
    const { isZenMode, toggleZenMode } = useZenMode();
    const [planningRitualOpen, setPlanningRitualOpen] = useState(false);
    const [smartScheduleOpen, setSmartScheduleOpen] = useState(false);
    const [ritualType, setRitualType] = useState<"morning" | "evening">("morning");

    return (
        <div className="mt-4 space-y-1">
            <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start min-w-0"
                onClick={() => {
                    setRitualType("morning");
                    setPlanningRitualOpen(true);
                }}
            >
                <Sunrise className="mr-2 h-4 w-4 text-orange-500 shrink-0" />
                <span className="truncate">Morning Ritual</span>
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start min-w-0"
                onClick={() => {
                    setRitualType("evening");
                    setPlanningRitualOpen(true);
                }}
            >
                <Sunset className="mr-2 h-4 w-4 text-purple-500 shrink-0" />
                <span className="truncate">Evening Review</span>
            </Button>
            <Button
                id="zen-toggle"
                variant="ghost"
                size="sm"
                className={cn("w-full justify-start min-w-0", isZenMode && "bg-indigo-500/10 text-indigo-500")}
                onClick={toggleZenMode}
            >
                <Moon className="mr-2 h-4 w-4 shrink-0" />
                <span className="truncate">Zen Mode</span>
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setSmartScheduleOpen(true)}
            >
                <Sparkles className="mr-2 h-4 w-4 text-indigo-500 shrink-0" />
                <span className="truncate">Smart Schedule</span>
            </Button>
            <RescheduleButton />

            {/* Dialogs */}
            <PlanningRitual
                open={planningRitualOpen}
                onOpenChange={setPlanningRitualOpen}
                type={ritualType}
            />
            <SmartScheduleDialog
                open={smartScheduleOpen}
                onOpenChange={setSmartScheduleOpen}
            />
        </div>
    );
}
