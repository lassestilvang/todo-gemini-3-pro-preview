"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sunrise, Sunset, Sparkles } from "lucide-react";
import { PlanningRitual } from "@/components/tasks/PlanningRitual";
import { SmartScheduleDialog } from "@/components/tasks/SmartScheduleDialog";

export function SidebarRituals() {
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
