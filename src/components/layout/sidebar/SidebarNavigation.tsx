"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Inbox,
    Star,
    Calendar,
    Trophy,
    CalendarDays,
    ListTodo,
    BarChart2,
    History,
} from "lucide-react";
import { useTaskCounts } from "@/hooks/use-task-counts";

export const mainNav = [
    { name: "Inbox", href: "/inbox", icon: Inbox, color: "text-blue-500" },
    { name: "Today", href: "/today", icon: Star, color: "text-yellow-500" },
    { name: "Upcoming", href: "/upcoming", icon: Calendar, color: "text-pink-500" },
    { name: "All Tasks", href: "/all", icon: ListTodo, color: "text-gray-500" },
    { name: "Calendar", href: "/calendar", icon: CalendarDays, color: "text-indigo-500" },
    { name: "Calendar V2", href: "/calendar2", icon: CalendarDays, color: "text-sky-500" },
    { name: "Calendar V3", href: "/calendar3", icon: CalendarDays, color: "text-emerald-500" },
    { name: "Calendar V4", href: "/calendar4", icon: CalendarDays, color: "text-violet-500" },
    { name: "Achievements", href: "/achievements", icon: Trophy, color: "text-yellow-500" },
    { name: "Analytics", href: "/analytics", icon: BarChart2, color: "text-green-500" },
    { name: "Activity Log", href: "/activity", icon: History, color: "text-orange-500" },
];

export function SidebarNavigation() {
    const pathname = usePathname();
    const { inbox, today, upcoming, total } = useTaskCounts();

    const getCount = (href: string) => {
        switch (href) {
            case "/inbox": return inbox;
            case "/today": return today;
            case "/upcoming": return upcoming;
            case "/all": return total;
            default: return 0;
        }
    };

    return (
        <div className="space-y-1">
            {mainNav.map((item) => {
                const count = getCount(item.href);
                return (
                    <Button
                        key={item.href}
                        variant={pathname === item.href ? "secondary" : "ghost"}
                        className="w-full justify-start min-w-0 group"
                        asChild
                    >
                        <Link href={item.href} className="w-full flex items-center min-w-0">
                            <item.icon className={cn("mr-2 h-4 w-4 shrink-0", item.color)} />
                            <span className="truncate flex-1 text-left">{item.name}</span>
                            {count > 0 && (
                                <span className={cn(
                                    "ml-auto text-xs font-medium px-2 py-0.5 rounded-full transition-colors",
                                    pathname === item.href
                                        ? "bg-primary/20 text-primary"
                                        : "text-muted-foreground group-hover:text-foreground group-hover:bg-muted"
                                )}>
                                    {count}
                                </span>
                            )}
                        </Link>
                    </Button>
                );
            })}
        </div>
    );
}
