"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createList, updateList, deleteList } from "@/lib/actions";
import { useActionResult } from "@/hooks/useActionResult";
import { IconPicker } from "@/components/ui/icon-picker";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
        description?: string | null;
    };
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
    userId?: string;
}

export function ManageListDialog({ list, open, onOpenChange, trigger, userId }: ManageListDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    const router = useRouter();
    const effectiveOpen = open !== undefined ? open : internalOpen;
    const setEffectiveOpen = (val: boolean) => {
        if (onOpenChange) onOpenChange(val);
        setInternalOpen(val);
    };

    const { execute: executeCreate, isLoading: isCreating } = useActionResult({
        onSuccess: () => {
            setEffectiveOpen(false);
            toast.success("List created successfully");
            router.refresh();
        }
    });

    const { execute: executeUpdate, isLoading: isUpdating } = useActionResult({
        onSuccess: () => {
            setEffectiveOpen(false);
            toast.success("List updated successfully");
            router.refresh();
        }
    });

    const { execute: executeDelete, isLoading: isDeleting } = useActionResult({
        onSuccess: () => {
            setEffectiveOpen(false);
            toast.success("List deleted successfully");
            router.refresh();
        }
    });

    const isLoading = isCreating || isUpdating || isDeleting;

    const formKey = effectiveOpen ? (list ? `edit-${list.id}` : "create") : "closed";

    const onSubmit = async (data: any) => {
        const payload = { ...data, userId: userId! };

        if (list) {
            await executeUpdate(updateList, list.id, userId!, data);
        } else {
            await executeCreate(createList, payload);
        }
    };

    const onDelete = async () => {
        if (list && userId) {
            await deleteList(list.id, userId);
            setEffectiveOpen(false);
        }
    };

    return (
        <Dialog open={effectiveOpen} onOpenChange={setEffectiveOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{list ? "Edit List" : "New List"}</DialogTitle>
                </DialogHeader>
                <ListForm
                    key={formKey}
                    list={list}
                    userId={userId}
                    onSubmit={onSubmit}
                    onDelete={onDelete}
                    onCancel={() => setEffectiveOpen(false)}
                    isLoading={isLoading}
                />
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
        description?: string | null;
    };
    userId?: string;
    onSubmit: (data: any) => Promise<void>;
    onDelete: () => Promise<void>;
    onCancel: () => void;
    isLoading: boolean;
}

function ListForm({ list, userId, onSubmit, onDelete, onCancel, isLoading }: ListFormProps) {
    const [name, setName] = useState(list?.name || "");
    const [color, setColor] = useState(list?.color || COLORS[0]);
    const [icon, setIcon] = useState(list?.icon || "list");
    const [description, setDescription] = useState(list?.description || "");

    const isEdit = !!list;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit({ name, color, icon, description });
    };

    const handleDelete = async () => {
        if (confirm("Are you sure you want to delete this list? Tasks will be deleted.")) {
            await onDelete();
        }
    };



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
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="List Description (optional)"
                    rows={2}
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
                <IconPicker
                    value={icon}
                    onChange={setIcon}
                    userId={userId}
                />
            </div>

            <DialogFooter className="flex justify-between sm:justify-between">
                {isEdit && (
                    <Button type="button" variant="destructive" onClick={handleDelete}>
                        Delete
                    </Button>
                )}
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? "Saving..." : "Save"}
                    </Button>
                </div>
            </DialogFooter>
        </form>
    );
}
