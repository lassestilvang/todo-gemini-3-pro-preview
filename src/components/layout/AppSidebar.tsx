"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import {
    Calendar,
    CalendarDays,
    Inbox,
    ListTodo,
    Star,
    Plus,
    MoreHorizontal
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

import { ManageListDialog } from "@/components/tasks/ManageListDialog";
import { ManageLabelDialog } from "@/components/tasks/ManageLabelDialog";
import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { SearchDialog } from "@/components/tasks/SearchDialog";
import { getListIcon, getLabelIcon } from "@/lib/icons";
import { PlanningRitual } from "@/components/tasks/PlanningRitual";
import { SmartScheduleDialog } from "@/components/tasks/SmartScheduleDialog";
import { TemplateManager } from "@/components/tasks/TemplateManager";
import { Sunrise, Sunset, Sparkles, Calendar as CalendarIcon } from "lucide-react";

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

const mainNav = [
    { name: "Inbox", href: "/inbox", icon: Inbox, color: "text-blue-500" },
    { name: "Today", href: "/today", icon: Star, color: "text-yellow-500" },
    { name: "Next 7 Days", href: "/next-7-days", icon: Calendar, color: "text-purple-500" },
    { name: "Calendar", href: "/calendar", icon: CalendarIcon, color: "text-indigo-500" },
    { name: "Upcoming", href: "/upcoming", icon: CalendarDays, color: "text-pink-500" },
    { name: "All Tasks", href: "/all", icon: ListTodo, color: "text-gray-500" },
];

export function AppSidebar({ className, lists, labels }: { className?: string; lists: List[]; labels: Label[] }) {
    const pathname = usePathname();
    const [editingList, setEditingList] = useState<List | null>(null);
    const [editingLabel, setEditingLabel] = useState<Label | null>(null);
    const [planningRitualOpen, setPlanningRitualOpen] = useState(false);
    const [smartScheduleOpen, setSmartScheduleOpen] = useState(false);
    const [ritualType, setRitualType] = useState<"morning" | "evening">("morning");

    return (
        <div className={cn("pb-12 w-64 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-screen overflow-y-auto", className)}>
            <div className="space-y-4 py-4">
                <div className="pl-3 pr-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Planner
                    </h2>
                    <div className="mb-4">
                        <SearchDialog />
                    </div>
                    <div className="px-3 py-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs"
                            onClick={() => setSmartScheduleOpen(true)}
                        >
                            <Sparkles className="mr-2 h-3 w-3 text-indigo-500" />
                            Smart Schedule
                        </Button>
                        <div className="mt-2">
                            <TemplateManager />
                        </div>
                    </div>
                    <div className="space-y-1">
                        {mainNav.map((item) => (
                            <Button
                                key={item.href}
                                variant={pathname === item.href ? "secondary" : "ghost"}
                                className="w-full justify-start"
                            >
                                <Link href={item.href}>
                                    <item.icon className={cn("mr-2 h-4 w-4", item.color)} />
                                    {item.name}
                                </Link>
                            </Button>
                        ))}
                    </div>

                    {/* Planning Rituals */}
                    <div className="mt-4 space-y-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs"
                            onClick={() => {
                                setRitualType("morning");
                                setPlanningRitualOpen(true);
                            }}
                        >
                            <Sunrise className="mr-2 h-3 w-3 text-orange-500" />
                            Morning Ritual
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs"
                            onClick={() => {
                                setRitualType("evening");
                                setPlanningRitualOpen(true);
                            }}
                        >
                            <Sunset className="mr-2 h-3 w-3 text-purple-500" />
                            Evening Review
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs"
                            onClick={() => setSmartScheduleOpen(true)}
                        >
                            <Sparkles className="mr-2 h-3 w-3 text-indigo-500" />
                            Smart Schedule
                        </Button>
                    </div>
                </div>
                <Separator />
                <div className="pl-3 pr-6 py-2">
                    <div className="flex items-center justify-between px-4">
                        <h2 className="text-lg font-semibold tracking-tight">
                            Lists
                        </h2>
                        <ManageListDialog
                            trigger={
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Plus className="h-4 w-4" />
                                    <span className="sr-only">Add List</span>
                                </Button>
                            }
                        />
                    </div>
                    <div className="space-y-1 p-2">
                        {lists.map((list) => (
                            <div key={list.id} className="group flex items-center justify-between hover:bg-accent hover:text-accent-foreground rounded-md">
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "w-full justify-start font-normal hover:bg-transparent",
                                        pathname === `/lists/${list.id}` ? "bg-secondary" : ""
                                    )}
                                    asChild
                                >
                                    <Link href={`/lists/${list.id}`}>
                                        {/* We need to map icon string to component or just use a generic one if not found */}
                                        {(() => {
                                            const Icon = getListIcon(list.icon);
                                            return <Icon className="mr-2 h-4 w-4" style={{ color: list.color || "#000000" }} />;
                                        })()}
                                        {list.name}
                                    </Link>
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 mr-1">
                                            <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setEditingList(list)}>
                                            Edit
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                    </div>
                </div>
                <Separator />
                <div className="pl-3 pr-6 py-2">
                    <div className="flex items-center justify-between px-4">
                        <h2 className="text-lg font-semibold tracking-tight">
                            Labels
                        </h2>
                        <ManageLabelDialog
                            trigger={
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Plus className="h-4 w-4" />
                                    <span className="sr-only">Add Label</span>
                                </Button>
                            }
                        />
                    </div>
                    <div className="space-y-1 p-2">
                        {labels.map((label) => (
                            <div key={label.id} className="group flex items-center justify-between hover:bg-accent hover:text-accent-foreground rounded-md">
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "w-full justify-start font-normal hover:bg-transparent",
                                        pathname === `/labels/${label.id}` ? "bg-secondary" : ""
                                    )}
                                    asChild
                                >
                                    <Link href={`/labels/${label.id}`}>
                                        {(() => {
                                            const Icon = getLabelIcon(label.icon);
                                            return <Icon className="mr-2 h-4 w-4" style={{ color: label.color || "#000000" }} />;
                                        })()}
                                        {label.name}
                                    </Link>
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 mr-1">
                                            <MoreHorizontal className="h-3 w-3" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setEditingLabel(label)}>
                                            Edit
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Edit Dialogs */}
            {editingList && (
                <ManageListDialog
                    list={editingList}
                    open={!!editingList}
                    onOpenChange={(open) => !open && setEditingList(null)}
                />
            )}
            {editingLabel && (
                <ManageLabelDialog
                    label={editingLabel}
                    open={!!editingLabel}
                    onOpenChange={(open) => !open && setEditingLabel(null)}
                />
            )}

            {/* Planning Ritual Dialog */}
            <PlanningRitual
                open={planningRitualOpen}
                onOpenChange={setPlanningRitualOpen}
                type={ritualType}
            />

            {/* Smart Schedule Dialog */}
            <SmartScheduleDialog
                open={smartScheduleOpen}
                onOpenChange={setSmartScheduleOpen}
            />
        </div>
    );
}
