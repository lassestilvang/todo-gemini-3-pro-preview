"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Calendar,
    CalendarDays,
    Inbox,
    ListTodo,
    Settings,
    Star,
    Plus,
    Hash,
    Search
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

const mainNav = [
    { name: "Inbox", href: "/inbox", icon: Inbox, color: "text-blue-500" },
    { name: "Today", href: "/today", icon: Star, color: "text-yellow-500" },
    { name: "Next 7 Days", href: "/next-7-days", icon: Calendar, color: "text-purple-500" },
    { name: "Upcoming", href: "/upcoming", icon: CalendarDays, color: "text-pink-500" },
    { name: "All Tasks", href: "/all", icon: ListTodo, color: "text-gray-500" },
];

export function AppSidebar({ className }: { className?: string }) {
    const pathname = usePathname();

    return (
        <div className={cn("pb-12 w-64 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
            <div className="space-y-4 py-4">
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Planner
                    </h2>
                    <div className="space-y-1">
                        {mainNav.map((item) => (
                            <Button
                                key={item.href}
                                variant={pathname === item.href ? "secondary" : "ghost"}
                                className="w-full justify-start"
                                asChild
                            >
                                <Link href={item.href}>
                                    <item.icon className={cn("mr-2 h-4 w-4", item.color)} />
                                    {item.name}
                                </Link>
                            </Button>
                        ))}
                    </div>
                </div>
                <Separator />
                <div className="px-3 py-2">
                    <div className="flex items-center justify-between px-4">
                        <h2 className="text-lg font-semibold tracking-tight">
                            Lists
                        </h2>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Plus className="h-4 w-4" />
                            <span className="sr-only">Add List</span>
                        </Button>
                    </div>
                    <ScrollArea className="h-[300px] px-1">
                        <div className="space-y-1 p-2">
                            {/* TODO: Map through user lists */}
                            <Button variant="ghost" className="w-full justify-start font-normal">
                                <div className="mr-2 h-3 w-3 rounded-full bg-red-500" />
                                Personal
                            </Button>
                            <Button variant="ghost" className="w-full justify-start font-normal">
                                <div className="mr-2 h-3 w-3 rounded-full bg-green-500" />
                                Work
                            </Button>
                        </div>
                    </ScrollArea>
                </div>
                <Separator />
                <div className="px-3 py-2">
                    <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                        Labels
                    </h2>
                    <div className="space-y-1">
                        {/* TODO: Map through labels */}
                        <Button variant="ghost" className="w-full justify-start font-normal">
                            <Hash className="mr-2 h-4 w-4 text-muted-foreground" />
                            Urgent
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
