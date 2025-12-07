"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { XPBar } from "@/components/gamification/XPBar";
import { Separator } from "@/components/ui/separator";

import { RescheduleButton } from "@/components/tasks/RescheduleButton";
import { InstallPrompt } from "@/components/InstallPrompt";
import { SearchDialog } from "@/components/tasks/SearchDialog";
import { TemplateManager } from "@/components/tasks/TemplateManager";
import { SettingsDialog } from "@/components/settings/SettingsDialog";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { SmartScheduleDialog } from "@/components/tasks/SmartScheduleDialog";

import { SidebarNavigation } from "./sidebar/SidebarNavigation";
import { SidebarLists } from "./sidebar/SidebarLists";
import { SidebarLabels } from "./sidebar/SidebarLabels";
import { SidebarRituals } from "./sidebar/SidebarRituals";

// Types matching those in sub-components
type List = {
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
    slug: string;
};

type Label = {
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
};

export function AppSidebar({ className, lists, labels }: { className?: string; lists: List[]; labels: Label[] }) {
    const [smartScheduleOpen, setSmartScheduleOpen] = useState(false);

    return (
        <div className={cn("pb-12 w-64 border-r bg-sidebar h-screen overflow-y-auto sidebar", className)}>
            <div className="space-y-4 py-4">
                <div className="pl-3 pr-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Planner
                    </h2>
                    <XPBar />
                    <div className="mb-4">
                        <SearchDialog />
                    </div>
                    <div className="py-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => setSmartScheduleOpen(true)}
                        >
                            <Sparkles className="mr-2 h-4 w-4 text-indigo-500" />
                            Smart Schedule
                        </Button>
                        <div className="mt-2">
                            <TemplateManager />
                        </div>
                    </div>

                    <SidebarNavigation />
                    <SidebarRituals />
                </div>

                <Separator />
                <SidebarLists lists={lists} />

                <Separator />
                <SidebarLabels labels={labels} />
            </div>

            {/* Smart Schedule Dialog (Triggered by the top button) */}
            <SmartScheduleDialog
                open={smartScheduleOpen}
                onOpenChange={setSmartScheduleOpen}
            />

            <div className="p-4 mt-auto border-t space-y-2">
                <InstallPrompt />
                <RescheduleButton />
                <SettingsDialog />
            </div>
        </div>
    );
}
