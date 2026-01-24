"use client";


import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, GripVertical, ArrowUpDown } from "lucide-react";
import { ManageLabelDialog } from "@/components/tasks/ManageLabelDialog";
import { getLabelIcon } from "@/lib/icons";
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
import { reorderLabels } from "@/lib/actions";

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

function SortableLabelItem({
    label,
    pathname,
    isReordering
}: {
    label: Label;
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
    } = useSortable({ id: label.id, disabled: !isReordering });

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
                    pathname === `/labels/${label.id}` ? "bg-secondary" : ""
                )}
                asChild
            >
                <Link href={`/labels/${label.id}`} className="w-full flex items-center min-w-0">
                    {React.createElement(getLabelIcon(label.icon), {
                        className: "mr-2 h-4 w-4 shrink-0",
                        style: { color: label.color || "#000000" }
                    })}
                    <span className="truncate">{label.name}</span>
                </Link>
            </Button>
        </div>
    );
}

export function SidebarLabels({ labels, userId }: SidebarLabelsProps) {
    const pathname = usePathname();
    const [items, setItems] = useState(labels);
    const [isReordering, setIsReordering] = useState(false);

    // Sync items when props change (server update)
    useEffect(() => {
        setItems(labels);
    }, [labels]);

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

                // Call server action
                if (userId) {
                    const updates = newItems.map((item, index) => ({
                        id: item.id,
                        position: index,
                    }));

                    reorderLabels(userId, updates).catch(console.error);
                }

                return newItems;
            });
        }
    };

    return (
        <div className="px-3 py-2" data-testid="sidebar-labels">
            <div className="flex items-center justify-between px-2">
                <h2 className="text-lg font-semibold tracking-tight">
                    Labels
                </h2>
                <div className="flex items-center gap-1">
                    <Button
                        variant={isReordering ? "secondary" : "ghost"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setIsReordering(!isReordering)}
                        title={isReordering ? "Done reordering" : "Reorder labels"}
                    >
                        <ArrowUpDown className="h-3.5 w-3.5" />
                    </Button>
                    <ManageLabelDialog
                        trigger={
                            <Button variant="ghost" size="icon" className="h-7 w-7" data-testid="add-label-button">
                                <Plus className="h-4 w-4" />
                                <span className="sr-only">Add Label</span>
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
                        {items.map((label) => (
                            <SortableLabelItem
                                key={label.id}
                                label={label}
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
