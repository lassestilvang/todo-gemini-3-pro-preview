"use client";


import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, ArrowUpDown } from "lucide-react";
import { ManageListDialog } from "@/components/tasks/ManageListDialog";
import { getListIcon } from "@/lib/icons";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    restrictToVerticalAxis,
} from "@dnd-kit/modifiers";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reorderLists } from "@/lib/actions";

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

function SortableListItem({
    list,
    pathname,
    isReordering
}: {
    list: List;
    pathname: string;
    isReordering: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: list.id, disabled: !isReordering });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? "none" : transition,
        zIndex: isDragging ? 50 : 0,
        position: "relative" as const,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group flex items-center justify-between rounded-md",
                isDragging ? "bg-accent/50 opacity-80 shadow-sm" : "hover:bg-accent hover:text-accent-foreground"
            )}
        >
            {isReordering && (
                <div
                    className="cursor-grab p-2 text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors touch-none"
                    {...listeners}
                    {...attributes}
                >
                    <GripVertical className="h-3 w-3" />
                </div>
            )}
            <Button
                variant="ghost"
                className={cn(
                    "flex-1 justify-start font-normal hover:bg-transparent px-2 min-w-0",
                    !isReordering && "pl-4",
                    pathname === `/lists/${list.id}` ? "bg-secondary" : ""
                )}
                asChild
            >
                <Link href={`/lists/${list.id}`} className="w-full flex items-center min-w-0">
                    {React.createElement(getListIcon(list.icon), {
                        className: "mr-2 h-4 w-4 shrink-0",
                        style: { color: list.color || "#000000" }
                    })}
                    <span className="truncate">{list.name}</span>
                </Link>
            </Button>
        </div>
    );
}

export function SidebarLists({ lists, userId }: SidebarListsProps) {
    const pathname = usePathname();
    const [items, setItems] = useState(lists);
    const [isReordering, setIsReordering] = useState(false);

    // Sync items when props change (server update)
    useEffect(() => {
        setItems(lists);
    }, [lists]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5, // Slightly more responsive
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);

                const newItems = arrayMove(items, oldIndex, newIndex);

                if (userId) {
                    const updates = newItems.map((item, index) => ({
                        id: item.id,
                        position: index,
                    }));
                    reorderLists(userId, updates).catch(console.error);
                }

                return newItems;
            });
        }
    };

    return (
        <div className="px-3 py-2" data-testid="sidebar-lists">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-semibold tracking-tight">
                    Lists
                </h2>
                <div className="flex items-center gap-1">
                    <Button
                        variant={isReordering ? "secondary" : "ghost"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setIsReordering(!isReordering)}
                        title={isReordering ? "Done reordering" : "Reorder lists"}
                    >
                        <ArrowUpDown className="h-3.5 w-3.5" />
                    </Button>
                    <ManageListDialog
                        trigger={
                            <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="add-list-button">
                                <Plus className="h-4 w-4" />
                                <span className="sr-only">Add List</span>
                            </Button>
                        }
                        userId={userId}
                    />
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis]}
            >
                <SortableContext
                    items={items.map(i => i.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-1 py-2">
                        {items.map((list) => (
                            <SortableListItem
                                key={list.id}
                                list={list}
                                pathname={pathname}
                                isReordering={isReordering}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>
        </div>
    );
}
