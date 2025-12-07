"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Inbox,
    Star,
    Calendar,
    CalendarIcon,
    Trophy,
    CalendarDays,
    ListTodo
} from "lucide-react";

export const mainNav = [
    { name: "Inbox", href: "/inbox", icon: Inbox, color: "text-blue-500" },
    { name: "Today", href: "/today", icon: Star, color: "text-yellow-500" },
    { name: "Next 7 Days", href: "/next-7-days", icon: Calendar, color: "text-purple-500" },
    { name: "Calendar", href: "/calendar", icon: CalendarIcon, color: "text-indigo-500" },
    { name: "Achievements", href: "/achievements", icon: Trophy, color: "text-yellow-500" },
    { name: "Upcoming", href: "/upcoming", icon: CalendarDays, color: "text-pink-500" },
    { name: "All Tasks", href: "/all", icon: ListTodo, color: "text-gray-500" },
];

export function SidebarNavigation() {
    const pathname = usePathname();

    return (
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
    );
}
