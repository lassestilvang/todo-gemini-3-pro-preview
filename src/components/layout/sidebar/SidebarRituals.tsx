"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sunrise, Sunset, Sparkles, Moon } from "lucide-react";
import { PlanningRitual } from "@/components/tasks/PlanningRitual";
import { SmartScheduleDialog } from "@/components/tasks/SmartScheduleDialog";
import { useZenMode } from "@/components/providers/ZenModeProvider";

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
                className="w-full justify-start"
                onClick={() => {
                    setRitualType("morning");
                    setPlanningRitualOpen(true);
                }}
            >
                <Sunrise className="mr-2 h-4 w-4 text-orange-500" />
                Morning Ritual
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => {
                    setRitualType("evening");
                    setPlanningRitualOpen(true);
                }}
            >
                <Sunset className="mr-2 h-4 w-4 text-purple-500" />
                Evening Review
            </Button>
            <Button
                id="zen-toggle"
                variant="ghost"
                size="sm"
                className={cn("w-full justify-start", isZenMode && "bg-indigo-500/10 text-indigo-500")}
                onClick={toggleZenMode}
            >
                <Moon className="mr-2 h-4 w-4" />
                Zen Mode
            </Button>
            <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => setSmartScheduleOpen(true)}
            >
                <Sparkles className="mr-2 h-4 w-4 text-indigo-500" />
                Smart Schedule
            </Button>

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
