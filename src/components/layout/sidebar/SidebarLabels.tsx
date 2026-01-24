"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal, GripVertical } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    onEdit
}: {
    label: Label;
    pathname: string;
    onEdit: (label: Label) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: label.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1 : 0,
        position: isDragging ? "relative" as const : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "group flex items-center justify-between rounded-md",
                isDragging ? "bg-accent/50 opacity-80" : "hover:bg-accent hover:text-accent-foreground"
            )}
            {...attributes}
        >
            <div
                className="cursor-grab p-2 opacity-0 group-hover:opacity-50 hover:opacity-100 flex items-center justify-center transition-opacity"
                {...listeners}
            >
                <GripVertical className="h-3 w-3" />
            </div>
            <Button
                variant="ghost"
                className={cn(
                    "flex-1 justify-start font-normal hover:bg-transparent px-2 pl-0",
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
                <DropdownMenuTrigger asChild aria-label={`Open menu for label ${label.name}`}>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 mr-1">
                        <MoreHorizontal className="h-3 w-3" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(label)}>
                        Edit
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

export function SidebarLabels({ labels, userId }: SidebarLabelsProps) {
    const pathname = usePathname();
    const [editingLabel, setEditingLabel] = useState<Label | null>(null);
    const [items, setItems] = useState(labels);

    // Sync items when props change (server update)
    useEffect(() => {
        setItems(labels);
    }, [labels]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
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

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={items.map(i => i.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-1 p-2">
                        {items.map((label) => (
                            <SortableLabelItem
                                key={label.id}
                                label={label}
                                pathname={pathname}
                                onEdit={setEditingLabel}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

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
