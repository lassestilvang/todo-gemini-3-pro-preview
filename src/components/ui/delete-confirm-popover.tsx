"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DeleteConfirmPopoverProps {
    children: React.ReactElement;
    description: string;
    title?: string;
    confirmText?: string;
    cancelText?: string;
    align?: "start" | "center" | "end";
    disabled?: boolean;
    isConfirming?: boolean;
    onConfirm: () => void | Promise<void>;
}

export function DeleteConfirmPopover({
    children,
    description,
    title = "Confirm Deletion",
    confirmText = "Confirm Delete",
    cancelText = "Cancel",
    align = "start",
    disabled = false,
    isConfirming = false,
    onConfirm,
}: DeleteConfirmPopoverProps) {
    const [open, setOpen] = useState(false);

    const handleConfirm = async () => {
        await onConfirm();
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild disabled={disabled}>
                {children}
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align={align}>
                <div className="flex flex-col gap-3">
                    <div className="flex items-start gap-3">
                        <div className="rounded-full bg-destructive/10 p-2 text-destructive">
                            <AlertTriangle className="h-4 w-4" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-medium leading-none">{title}</h4>
                            <p className="text-sm text-muted-foreground">{description}</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={isConfirming}>
                            {cancelText}
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleConfirm} disabled={isConfirming}>
                            {isConfirming && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {confirmText}
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
