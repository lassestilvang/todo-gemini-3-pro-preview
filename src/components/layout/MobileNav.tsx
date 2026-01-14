"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { AppSidebar } from "./AppSidebar";
import { useState } from "react";
// Same types as AppSidebar
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

interface MobileNavProps {
    lists: List[];
    labels: Label[];
    user?: User;
}

export function MobileNav({ lists, labels, user }: MobileNavProps) {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 bg-sidebar w-72 text-sidebar-foreground border-r">
                <AppSidebar
                    lists={lists}
                    labels={labels}
                    user={user}
                    className="w-full h-full border-none shadow-none"
                // We might need to listen to navigation events to close the sidebar on mobile
                // but usually keeping it open in SPA is fine, though typically clicking a link closes it.
                // This implementation doesn't auto-close on navigate yet.
                />
            </SheetContent>
        </Sheet>
    );
}
