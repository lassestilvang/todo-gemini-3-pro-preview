
import React from "react";
import { CheckCircle2, Clock, List, Tag, ArrowUpRight, History, Plus, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatTimePreference } from "@/lib/time-utils";

interface ActivityLogEntry {
    id: number;
    taskId: number | null;
    taskTitle: string | null;
    listId: number | null;
    listName: string | null;
    listSlug: string | null;
    labelId: number | null;
    labelName: string | null;
    action: string;
    details: string | null;
    createdAt: Date;
}

interface ActivityLogItemProps {
    log: ActivityLogEntry;
    use24h: boolean | null;
}

const getActionIcon = (action: string) => {
    if (action.includes("completed")) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (action.includes("created")) return <Plus className="h-4 w-4 text-blue-500" />;
    if (action.includes("updated")) return <Pencil className="h-4 w-4 text-amber-500" />;
    if (action.includes("deleted")) return <Trash2 className="h-4 w-4 text-red-500" />;
    return <History className="h-4 w-4 text-slate-500" />;
};

const getActionBadge = (action: string) => {
    const type = action.split("_")[0];
    switch (type) {
        case "task": return <Badge variant="outline" className="text-[10px] uppercase tracking-wider h-5">Task</Badge>;
        case "list": return <Badge variant="secondary" className="text-[10px] uppercase tracking-wider h-5 bg-blue-100/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">List</Badge>;
        case "label": return <Badge variant="secondary" className="text-[10px] uppercase tracking-wider h-5 bg-purple-100/50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">Label</Badge>;
        default: return <Badge variant="outline" className="text-[10px] uppercase tracking-wider h-5">Activity</Badge>;
    }
};

export function ActivityLogItem({ log, use24h }: ActivityLogItemProps) {
    return (
        <div className="space-y-1 relative before:absolute before:left-[17px] before:top-2 before:bottom-2 before:w-[2px] before:bg-muted/30">
            <div
                className="group relative flex items-start gap-4 p-3 rounded-xl hover:bg-muted/40 transition-all duration-200"
            >
                <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm transition-transform group-hover:scale-110">
                    {getActionIcon(log.action)}
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <span className="font-semibold text-sm capitalize truncate pr-1">
                                {log.action.replace(/_/g, " ")}
                            </span>
                            {getActionBadge(log.action)}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground bg-muted/30 py-1 px-2 rounded-full">
                            <Clock className="h-3 w-3" />
                            {formatTimePreference(new Date(log.createdAt), use24h)}
                        </div>
                    </div>

                    <div className="mt-1 flex items-center gap-2">
                        {log.taskTitle && (
                            <Link
                                href={`/activity?taskId=${log.taskId}`}
                                className="group/link inline-flex items-center gap-1.5 text-sm transition-colors hover:text-primary underline decoration-muted-foreground/30 underline-offset-4"
                            >
                                <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground group-hover/link:text-primary transition-colors" />
                                <span className="font-medium">{log.taskTitle}</span>
                                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                            </Link>
                        )}
                        {log.listName && (
                            <Link
                                href={`/lists/${log.listId}`}
                                className="group/link inline-flex items-center gap-1.5 text-sm transition-colors hover:text-primary underline decoration-muted-foreground/30 underline-offset-4"
                            >
                                <List className="h-3.5 w-3.5 text-muted-foreground group-hover/link:text-primary transition-colors" />
                                <span className="font-medium">{log.listName}</span>
                                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                            </Link>
                        )}
                        {log.labelName && (
                            <Link
                                href={`/labels/${log.labelId}`}
                                className="group/link inline-flex items-center gap-1.5 text-sm transition-colors hover:text-primary underline decoration-muted-foreground/30 underline-offset-4"
                            >
                                <Tag className="h-3.5 w-3.5 text-muted-foreground group-hover/link:text-primary transition-colors" />
                                <span className="font-medium">{log.labelName}</span>
                                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                            </Link>
                        )}
                    </div>

                    {log.details && (
                        <p className="mt-2 text-sm text-muted-foreground leading-relaxed italic bg-muted/10 p-2 rounded-lg border border-muted/5">
                            {log.details}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
