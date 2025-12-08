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
import { ManageListDialog } from "@/components/tasks/ManageListDialog";
import { getListIcon } from "@/lib/icons";

type List = {
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
    slug: string;
};

interface SidebarListsProps {
    lists: List[];
    userId?: string;
}

export function SidebarLists({ lists, userId }: SidebarListsProps) {
    const pathname = usePathname();
    const [editingList, setEditingList] = useState<List | null>(null);

    return (
        <div className="pl-3 pr-6 py-2">
            <div className="flex items-center justify-between px-4">
                <h2 className="text-lg font-semibold tracking-tight">
                    Lists
                </h2>
                <ManageListDialog
                    trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Plus className="h-4 w-4" />
                            <span className="sr-only">Add List</span>
                        </Button>
                    }
                    userId={userId}
                />
            </div>
            <div className="space-y-1 p-2">
                {lists.map((list) => (
                    <div key={list.id} className="group flex items-center justify-between hover:bg-accent hover:text-accent-foreground rounded-md">
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full justify-start font-normal hover:bg-transparent",
                                pathname === `/lists/${list.id}` ? "bg-secondary" : ""
                            )}
                            asChild
                        >
                            <Link href={`/lists/${list.id}`}>
                                {(() => {
                                    const Icon = getListIcon(list.icon);
                                    return <Icon className="mr-2 h-4 w-4" style={{ color: list.color || "#000000" }} />;
                                })()}
                                {list.name}
                            </Link>
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 mr-1">
                                    <MoreHorizontal className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingList(list)}>
                                    Edit
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                ))}
            </div>

            {/* Edit Dialog */}
            {editingList && (
                <ManageListDialog
                    list={editingList}
                    open={!!editingList}
                    onOpenChange={(open) => !open && setEditingList(null)}
                    userId={userId}
                />
            )}
        </div>
    );
}
