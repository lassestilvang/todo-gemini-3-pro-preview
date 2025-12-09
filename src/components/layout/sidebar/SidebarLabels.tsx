"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ManageLabelDialog } from "@/components/tasks/ManageLabelDialog";
import { getLabelIcon } from "@/lib/icons";

type Label = {
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
};

interface SidebarLabelsProps {
    labels: Label[];
    userId?: string;
}

export function SidebarLabels({ labels, userId }: SidebarLabelsProps) {
    const pathname = usePathname();
    const [editingLabel, setEditingLabel] = useState<Label | null>(null);

    return (
        <div className="pl-3 pr-6 py-2" data-testid="sidebar-labels">
            <div className="flex items-center justify-between px-4">
                <h2 className="text-lg font-semibold tracking-tight">
                    Labels
                </h2>
                <ManageLabelDialog
                    trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="add-label-button">
                            <Plus className="h-4 w-4" />
                            <span className="sr-only">Add Label</span>
                        </Button>
                    }
                    userId={userId}
                />
            </div>
            <div className="space-y-1 p-2">
                {labels.map((label) => (
                    <div key={label.id} className="group flex items-center justify-between hover:bg-accent hover:text-accent-foreground rounded-md">
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full justify-start font-normal hover:bg-transparent",
                                pathname === `/labels/${label.id}` ? "bg-secondary" : ""
                            )}
                            asChild
                        >
                            <Link href={`/labels/${label.id}`}>
                                {(() => {
                                    const Icon = getLabelIcon(label.icon);
                                    return <Icon className="mr-2 h-4 w-4" style={{ color: label.color || "#000000" }} />;
                                })()}
                                {label.name}
                            </Link>
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 mr-1">
                                    <MoreHorizontal className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingLabel(label)}>
                                    Edit
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}
            </div>

            {/* Edit Dialog */}
            {editingLabel && (
                <ManageLabelDialog
                    label={editingLabel}
                    open={!!editingLabel}
                    onOpenChange={(open) => !open && setEditingLabel(null)}
                    userId={userId}
                />
            )}
        </div>
    );
}
