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
import { createLabel, updateLabel, deleteLabel } from "@/lib/actions";
import {
    Tag,
    Flag,
    Bookmark,
    AlertCircle,
    CheckCircle,
    Clock,
    Zap,
    Heart,
    Star,
    Hash
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const ICONS = [
    { name: "hash", icon: Hash },
    { name: "tag", icon: Tag },
    { name: "flag", icon: Flag },
    { name: "bookmark", icon: Bookmark },
    { name: "alert", icon: AlertCircle },
    { name: "check", icon: CheckCircle },
    { name: "clock", icon: Clock },
    { name: "zap", icon: Zap },
    { name: "heart", icon: Heart },
    { name: "star", icon: Star },
];

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

interface ManageLabelDialogProps {
    label?: {
        id: number;
        name: string;
        color: string | null;
        icon: string | null;
    };
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    trigger?: React.ReactNode;
}

export function ManageLabelDialog({ label, open, onOpenChange, trigger }: ManageLabelDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);

    const isEdit = !!label;
    const effectiveOpen = open !== undefined ? open : internalOpen;
    const setEffectiveOpen = onOpenChange || setInternalOpen;

    // Use a key to force re-mounting of the form when the dialog opens/closes or label changes
    const formKey = effectiveOpen ? (label ? `edit-${label.id}` : "create") : "closed";

    return (
        <Dialog open={effectiveOpen} onOpenChange={setEffectiveOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? "Edit Label" : "New Label"}</DialogTitle>
                </DialogHeader>
                <LabelForm key={formKey} label={label} onClose={() => setEffectiveOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}

function LabelForm({ label, onClose }: { label?: { id: number; name: string; color: string | null; icon: string | null; }, onClose: () => void }) {
    const [name, setName] = useState(label?.name || "");
    const [color, setColor] = useState(label?.color || COLORS[0]);
    const [icon, setIcon] = useState(label?.icon || "hash");

    const isEdit = !!label;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (label) {
                await updateLabel(label.id, { name, color, icon });
            } else {
                await createLabel({ name, color, icon });
            }
            onClose();
        } catch (error) {
            console.error("Failed to save label:", error);
        }
    };

    const handleDelete = async () => {
        if (!label) return;
        if (confirm("Are you sure you want to delete this label?")) {
            await deleteLabel(label.id);
            onClose();
        }
    };

    const SelectedIcon = ICONS.find(i => i.name === icon)?.icon || Hash;

    return (
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Label Name"
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
