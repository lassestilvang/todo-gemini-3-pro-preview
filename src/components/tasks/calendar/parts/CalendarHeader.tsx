
import React from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CalendarHeaderProps {
    currentMonth: Date;
    onPrev: () => void;
    onNext: () => void;
    onToday: () => void;
}

export function CalendarHeader({ currentMonth, onPrev, onNext, onToday }: CalendarHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">
                    {format(currentMonth, "MMMM yyyy")}
                </h3>
                <div className="flex items-center rounded-md border bg-background shadow-sm">
                    <Button variant="ghost" size="icon" onClick={onPrev} className="h-7 w-7">
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onToday} className="h-7 px-2 text-xs font-medium">
                        Today
                    </Button>
                    <Button variant="ghost" size="icon" onClick={onNext} className="h-7 w-7">
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            <div className="flex gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-500" />High</div>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />Med</div>
                <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" />Low</div>
            </div>
        </div>
    );
}
