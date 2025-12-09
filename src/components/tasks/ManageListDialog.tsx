"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createList, updateList, deleteList } from "@/lib/actions";
import { LIST_ICONS as ICONS } from "@/lib/icons";
import { ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const COLORS = [
    "#000000", // Black
    "#ef4444", // Red
    "#f97316", // Orange
    "#eab308", // Yellow
    "#22c55e", // Green
    "#06b6d4", // Cyan
    "#3b82f6", // Blue
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#64748b", // Slate
];

interface ManageListDialogProps {
    list?: {
        id: number;
        name: string;
        color: string | null;
        icon: string | null;
    };
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
    userId?: string;
}

export function ManageListDialog({ list, open, onOpenChange, trigger, userId }: ManageListDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    const effectiveOpen = open !== undefined ? open : internalOpen;
    const setEffectiveOpen = onOpenChange || setInternalOpen;

    const formKey = effectiveOpen ? (list ? `edit-${list.id}` : "create") : "closed";

    return (
        <Dialog open={effectiveOpen} onOpenChange={setEffectiveOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{list ? "Edit List" : "New List"}</DialogTitle>
                </DialogHeader>
                <ListForm key={formKey} list={list} userId={userId} onClose={() => setEffectiveOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}

interface ListFormProps {
    list?: {
        id: number;
        name: string;
        color: string | null;
        icon: string | null;
    };
    userId?: string;
    onClose: () => void;
}

function ListForm({ list, userId, onClose }: ListFormProps) {
    const [name, setName] = useState(list?.name || "");
    const [color, setColor] = useState(list?.color || COLORS[0]);
    const [icon, setIcon] = useState(list?.icon || "list");

    const isEdit = !!list;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId) return;
        try {
            if (isEdit) {
                await updateList(list.id, userId, { name, color, icon });
            } else {
                await createList({
                    name,
                    color,
                    icon,
                    slug: name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(), // Simple slug generation
                    userId
                });
            }
            onClose();
        } catch (error) {
            console.error("Failed to save list:", error);
        }
    };

    const handleDelete = async () => {
        if (!isEdit || !userId) return;
        if (confirm("Are you sure you want to delete this list? Tasks will be deleted.")) {
            try {
                await deleteList(list.id, userId);
                onClose();
            } catch (error) {
                console.error("Failed to delete list:", error);
            }
        }
    };

    const SelectedIcon = ICONS.find(i => i.name === icon)?.icon || ListTodo;

    return (
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="List Name"
                    required
                />
            </div>

            <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex flex-wrap gap-2">
                    {COLORS.map((c) => (
                        <button
                            key={c}
                            type="button"
                            className={cn(
                                "h-6 w-6 rounded-full border border-muted transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                color === c ? "ring-2 ring-ring ring-offset-2 scale-110" : ""
                            )}
                            style={{ backgroundColor: c }}
                            onClick={() => setColor(c)}
                        />
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <Label>Icon</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                            <SelectedIcon className="mr-2 h-4 w-4" />
                            {icon}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-2">
                        <div className="grid grid-cols-4 gap-2">
                            {ICONS.map((item) => (
                                <Button
                                    key={item.name}
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-10 w-10",
                                        icon === item.name ? "bg-accent" : ""
                                    )}
                                    onClick={() => setIcon(item.name)}
                                    type="button"
                                >
                                    <item.icon className="h-5 w-5" />
                                </Button>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            <DialogFooter className="flex justify-between sm:justify-between">
                {isEdit && (
                    <Button type="button" variant="destructive" onClick={handleDelete}>
                        Delete
                    </Button>
                )}
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button type="submit">Save</Button>
                </div>
            </DialogFooter>
        </form>
    );
}
