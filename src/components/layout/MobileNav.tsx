"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MobileNavProps {
    children: React.ReactNode;
}

export function MobileNav({ children }: MobileNavProps) {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="md:hidden">
                            <Menu className="h-6 w-6" />
                            <span className="sr-only">Toggle menu</span>
                        </Button>
                    </SheetTrigger>
                </TooltipTrigger>
                <TooltipContent>
                    <p>Open Navigation Menu</p>
                </TooltipContent>
            </Tooltip>
            <SheetContent side="left" className="p-0 bg-sidebar w-72 h-full text-sidebar-foreground border-r">
                {children}
            </SheetContent>
        </Sheet>
    );
}
