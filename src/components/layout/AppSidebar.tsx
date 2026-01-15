"use client";

import { Suspense } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { XPBar } from "@/components/gamification/XPBar";
import { Separator } from "@/components/ui/separator";

import { RescheduleButton } from "@/components/tasks/RescheduleButton";
import { InstallPrompt } from "@/components/InstallPrompt";
import dynamic from "next/dynamic";
const SearchDialog = dynamic(() => import("@/components/tasks/SearchDialog").then(mod => mod.SearchDialog), { ssr: false });
const TemplateManager = dynamic(() => import("@/components/tasks/TemplateManager").then(mod => mod.TemplateManager), { ssr: false });


import { UserProfile } from "./UserProfile";
import { Sparkles } from "lucide-react";
import { useState } from "react";

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
                "flex flex-col h-full border-r bg-card/50 backdrop-blur-xl w-64 shrink-0 transition-all duration-300",
                className
            )}
            data-testid="app-sidebar"
        >
            <div className="flex-1 overflow-y-auto overflow-x-hidden pt-4 custom-scrollbar">
                <div className="pl-3 pr-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Planner
                    </h2>
                    <XPBar userId={user?.id} />
                    <div className="mb-4">
                        <Suspense fallback={<div className="h-10 bg-muted/20 animate-pulse rounded-md mt-2" />}>
                            <SearchDialog userId={user?.id} />
                        </Suspense>
                    </div>
                    <div className="py-2">

                        <div className="mt-2">
                            <Suspense fallback={<div className="h-10 bg-muted/20 animate-pulse rounded-md mt-2" />}>
                                <TemplateManager userId={user?.id} />
                            </Suspense>
                        </div>
                    </div>

                    <SidebarNavigation />
                    <SidebarRituals />
                </div>

                <Separator />
                <SidebarLists lists={lists} userId={user?.id} />

                <Separator />
                <SidebarSavedViews userId={user?.id} />

                <Separator />
                <SidebarLabels labels={labels} userId={user?.id} />
            </div>

            <div className="shrink-0 p-2 border-t space-y-2 bg-sidebar h-auto">
                <InstallPrompt />
                <RescheduleButton />
                {user && <UserProfile user={user} />}
            </div>
        </aside>
    );
}
