"use client";

import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSavedViews, deleteSavedView } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Filter, Trash2, Plus, Info } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

function AddViewHelpDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="How to add a view">
                    <Plus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>How to create a Saved View</DialogTitle>
                    <div className="pt-4 space-y-4 text-sm text-muted-foreground">
                        <p>
                            Saved Views are custom filter presets that help you quickly access specific sets of tasks.
                        </p>
                        <div className="space-y-2">
                            <p className="font-medium text-foreground">Steps to create a view:</p>
                            <ol className="list-decimal list-inside space-y-1">
                                <li>Navigate to any list (like Inbox, Today, or a custom list).</li>
                                <li>Click the <strong className="text-foreground">&quot;View&quot;</strong> button in the top right corner.</li>
                                <li>Adjust the layout, filters, and sorting to your liking.</li>
                                <li>Enter a name in the <strong className="text-foreground">&quot;Save as new view&quot;</strong> section.</li>
                                <li>Click <strong className="text-foreground">&quot;Save&quot;</strong>.</li>
                            </ol>
                        </div>
                        <p>
                            Once saved, your new view will appear here for quick access.
                        </p>
                    </div>
                </DialogHeader>
            </DialogContent>
        </Dialog >
    );
}

export function SidebarSavedViews({ userId }: { userId?: string }) {
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

    if (!userId) return null;

    return (
        <div className="px-3 py-2" data-testid="sidebar-saved-views">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-semibold tracking-tight">
                    Saved Views
                </h2>
                <AddViewHelpDialog />
            </div>

            <div className="space-y-0.5 py-2">
                {isLoading ? (
                    <div className="space-y-2 py-2 px-2">
                        <div className="h-8 bg-muted/20 animate-pulse rounded-md w-full" />
                        <div className="h-8 bg-muted/20 animate-pulse rounded-md w-full" />
                    </div>
                ) : views && views.length > 0 ? (
                    views.map((view) => {
                        const href = `/views/${view.id}`;
                        const isActive = pathname === href;

                        return (
                            <div key={view.id} className="group relative min-w-0">
                                <Button
                                    variant={isActive ? "secondary" : "ghost"}
                                    size="sm"
                                    className={cn(
                                        "w-full justify-start pl-8 pr-12 min-w-0 font-normal",
                                        isActive && "bg-secondary"
                                    )}
                                    asChild
                                >
                                    <Link
                                        href={href}
                                        className="w-full flex items-center min-w-0"
                                        aria-current={isActive ? "page" : undefined}
                                    >
                                        <Filter className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        <span className="truncate">{view.name}</span>
                                    </Link>
                                </Button>
                                <button
                                    onClick={() => deleteMutation.mutate(view.id)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                                    title="Delete view"
                                    aria-label="Delete view"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        );
                    })
                ) : (
                    <div className="px-4 py-3 text-xs text-muted-foreground bg-muted/30 rounded-lg mx-2 flex flex-col gap-2">
                        <div className="flex items-center gap-2 font-medium text-foreground/80">
                            <Info className="h-3.5 w-3.5" />
                            <span>No saved views</span>
                        </div>
                        <p>
                            Create custom filters for your tasks and save them for quick access.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
