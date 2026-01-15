"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Zap, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { createTask } from "@/lib/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function QuickCapture({ userId }: { userId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!title.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            await createTask({
                userId,
                title: title.trim(),
                listId: null, // Defaults to inbox
            });
            toast.success("Task captured to Inbox");
            setTitle("");
            setIsOpen(false);
        } catch (error) {
            toast.error("Failed to capture task");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-40">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="absolute bottom-16 right-0 w-[320px] bg-card p-4 rounded-xl border shadow-2xl space-y-3"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                <Zap className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                Quick Capture
                            </h3>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => setIsOpen(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <Input
                                ref={inputRef}
                                placeholder="What's on your mind?..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="bg-muted/30 focus-visible:ring-indigo-500"
                                disabled={isSubmitting}
                            />
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={!title.trim() || isSubmitting}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save to Inbox"}
                                </Button>
                            </div>
                        </form>
                    </motion.div>
                )}
            </AnimatePresence>

            <Button
                id="quick-capture-fab"
                size="icon"
                className={cn(
                    "h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95",
                    isOpen ? "bg-indigo-600 rotate-45" : "bg-primary"
                )}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Quick Capture"
            >
                <Plus className={cn("h-7 w-7 transition-transform", isOpen ? "rotate-0" : "")} />
            </Button>
        </div>
    );
}
