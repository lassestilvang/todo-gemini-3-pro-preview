"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

export function KeyboardShortcuts() {
    const router = useRouter();
    const [showHelp, setShowHelp] = useState(false);

    const handleCreate = useCallback(() => {
        router.push("?create=true");
    }, [router]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
                return;
            }

            if (e.key === "C" || e.key === "c") {
                if (e.shiftKey) {
                    e.preventDefault();
                    handleCreate();
                }
            }

            if (e.key === "?" || (e.key === "h" && e.shiftKey)) {
                e.preventDefault();
                setShowHelp(true);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [router]);

    return (
        <Dialog open={showHelp} onOpenChange={setShowHelp}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Keyboard className="h-5 w-5" />
                        Keyboard Shortcuts
                    </DialogTitle>
                    <DialogDescription>
                        Boost your productivity with these shortcuts.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 items-center gap-4">
                        <span className="text-sm font-medium">Create Task</span>
                        <kbd className="justify-self-end pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            Shift + C
                        </kbd>
                    </div>
                    <div className="grid grid-cols-2 items-center gap-4">
                        <span className="text-sm font-medium">Search</span>
                        <kbd className="justify-self-end pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            /
                        </kbd>
                    </div>
                    <div className="grid grid-cols-2 items-center gap-4">
                        <span className="text-sm font-medium">Global Search</span>
                        <kbd className="justify-self-end pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            ⌘ K
                        </kbd>
                    </div>
                    <div className="grid grid-cols-2 items-center gap-4">
                        <span className="text-sm font-medium">Show Shortcuts</span>
                        <kbd className="justify-self-end pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            ?
                        </kbd>
                    </div>
                    <div className="grid grid-cols-2 items-center gap-4">
                        <span className="text-sm font-medium">Navigation (Vim-style)</span>
                        <kbd className="justify-self-end pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            J / K
                        </kbd>
                    </div>
                    <div className="grid grid-cols-2 items-center gap-4">
                        <span className="text-sm font-medium">Toggle Zen Mode</span>
                        <kbd className="justify-self-end pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            ⌘ Z
                        </kbd>
                    </div>
                    <div className="grid grid-cols-2 items-center gap-4">
                        <span className="text-sm font-medium">Cycle Sidebar</span>
                        <kbd className="justify-self-end pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                            {"⌘\\"}
                        </kbd>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
