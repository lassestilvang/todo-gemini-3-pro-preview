"use client";

import { cn } from "@/lib/utils";
import { XPBar } from "@/components/gamification/XPBar";
import { Separator } from "@/components/ui/separator";

import { SearchDialog } from "@/components/tasks/SearchDialog";
import { TemplateManager } from "@/components/tasks/TemplateManager";

import { UserProfile } from "./UserProfile";

import { SidebarNavigation } from "./sidebar/SidebarNavigation";
import { SidebarLists } from "./sidebar/SidebarLists";
import { SidebarLabels } from "./sidebar/SidebarLabels";
import { SidebarRituals } from "./sidebar/SidebarRituals";
import { SidebarSavedViews } from "./sidebar/SidebarSavedViews";

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

type User = {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
} | null;

interface AppSidebarProps {
    className?: string;
    lists: List[];
    labels: Label[];
    user?: User;
    id?: string;
}

export function AppSidebar({ className, lists, labels, user, id }: AppSidebarProps) {


    return (
        <aside
            id={id}
            className={cn(
                "flex flex-col h-full overflow-hidden border-r bg-card/50 backdrop-blur-xl shrink-0 transition-all duration-300 w-full",
                className
            )}
            data-testid="app-sidebar"
        >
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-4 custom-scrollbar">
                <div className="pl-3 pr-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Planner
                    </h2>
                    <div className="mb-4">
                        <SearchDialog userId={user?.id} />
                    </div>
                    <SidebarNavigation />
                    <SidebarRituals />
                    <div className="mt-1">
                        <TemplateManager userId={user?.id} />
                    </div>
                </div>

                <Separator />
                <SidebarLists lists={lists} userId={user?.id} />

                <Separator />
                <SidebarLabels labels={labels} userId={user?.id} />

                <Separator />
                <SidebarSavedViews userId={user?.id} />
            </div>

            <div className="shrink-0 p-2 border-t space-y-4 bg-sidebar h-auto">
                <div className="px-2">
                    <XPBar userId={user?.id} />
                </div>
                {user && <UserProfile user={user} />}
            </div>
        </aside>
    );
}
