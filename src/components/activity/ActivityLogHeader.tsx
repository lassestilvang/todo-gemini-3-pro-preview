
import React from "react";
import { isToday, isYesterday, format } from "date-fns";

interface ActivityLogHeaderProps {
    date: string;
}

export const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEEE, MMMM do");
};

export function ActivityLogHeader({ date }: ActivityLogHeaderProps) {
    return (
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm py-2 px-4 mb-4 -mx-4 border-y border-muted/20">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                {date ? formatDateHeader(date) : ""}
            </h3>
        </div>
    );
}
