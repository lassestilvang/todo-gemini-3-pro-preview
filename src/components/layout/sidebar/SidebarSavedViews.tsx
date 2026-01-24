"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSavedViews, deleteSavedView } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Filter, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarSavedViews({ userId }: { userId?: string }) {
    const [isExpanded, setIsExpanded] = useState(true);
    const queryClient = useQueryClient();
    const pathname = usePathname();

    const { data: views, isLoading } = useQuery({
        queryKey: ["savedViews", userId],
        queryFn: () => userId ? getSavedViews(userId) : Promise.resolve([]),
        enabled: !!userId,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => userId ? deleteSavedView(id, userId) : Promise.resolve({ success: false }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["savedViews", userId] });
            toast.success("View deleted");
        },
    });

    if (!userId || (views && views.length === 0 && !isLoading)) return null;

    return (
        <div className="px-3 py-2 space-y-1">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-muted/50 transition-colors group"
            >
                <span className="flex items-center gap-2">
                    <Filter className="h-3 w-3" />
                    Saved Views
                </span>
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </button>

            {isExpanded && (
                <div className="space-y-0.5 py-1">
                    {isLoading ? (
                        <div className="space-y-2 py-2">
                            <div className="h-8 bg-muted/20 animate-pulse rounded-md w-full" />
                            <div className="h-8 bg-muted/20 animate-pulse rounded-md w-full" />
                        </div>
                    ) : views?.map((view) => {
                        const href = `/views/${view.id}`;
                        const isActive = pathname === href;

                        return (
                            <div key={view.id} className="group relative min-w-0">
                                <Button
                                    variant={isActive ? "secondary" : "ghost"}
                                    size="sm"
                                    className={cn(
                                        "w-full justify-start pl-10 pr-12 min-w-0",
                                        isActive && "bg-secondary"
                                    )}
                                    asChild
                                >
                                    <Link href={href} className="w-full flex items-center min-w-0">
                                        <span className="truncate">{view.name}</span>
                                    </Link>
                                </Button>
                                <button
                                    onClick={() => deleteMutation.mutate(view.id)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Delete view"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
