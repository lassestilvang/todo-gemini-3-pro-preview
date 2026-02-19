"use client";

import { useState, useRef } from "react";
import { Plus, Zap, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { m, AnimatePresence } from "framer-motion";
import { createTask } from "@/lib/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { VoiceInput } from "./VoiceInput";
import { usePerformanceMode } from "@/components/providers/PerformanceContext";
import { useIsClient } from "@/hooks/use-is-client";

export function QuickCapture({ userId }: { userId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!title.trim() || isSubmitting) return;

        setIsSubmitting(true);
        const result = await createTask({
            userId,
            title: title.trim(),
            listId: null, // Defaults to inbox
        });
        if (result.success) {
            toast.success("Task captured to Inbox");
            setTitle("");
            setIsOpen(false);
        } else {
            toast.error(result.error.message);
        }
        setIsSubmitting(false);
    };

    const handleToggleOpen = () => {
        setIsOpen((prev) => {
            const next = !prev;
            if (next) {
                queueMicrotask(() => {
                    inputRef.current?.focus();
                });
            }
            return next;
        });
    };

    const isPerformanceMode = usePerformanceMode();
    const isClient = useIsClient();
    const resolvedPerformanceMode = isClient && isPerformanceMode;

    return (
        <div className="fixed bottom-6 right-6 z-40">
            {!resolvedPerformanceMode ? (
                <AnimatePresence>
                    {isOpen && (
                        <m.div
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
                                    <VoiceInput
                                        onTranscript={(text) => setTitle(prev => prev ? `${prev} ${text}` : text)}
                                    />
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
                        </m.div>
                    )}
                </AnimatePresence>
            ) : (
                isOpen && (
                    <div className="absolute bottom-16 right-0 w-[320px] bg-card p-4 rounded-xl border shadow-2xl space-y-3">
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
                                <VoiceInput
                                    onTranscript={(text) => setTitle(prev => prev ? `${prev} ${text}` : text)}
                                />
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
                    </div>
                )
            )}

            <Button
                id="quick-capture-fab"
                size="icon"
                className={cn(
                    "h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-110 active:scale-95",
                    isOpen ? "bg-indigo-600 rotate-45" : "bg-primary",
                    resolvedPerformanceMode && "transition-none hover:scale-100 active:scale-100 shadow-none border-2 border-primary rotate-0"
                )}
                onClick={handleToggleOpen}
                aria-label="Quick Capture"
            >
                <Plus className={cn("h-7 w-7 transition-transform", (isOpen && resolvedPerformanceMode) ? "rotate-45" : "rotate-0")} />
            </Button>
        </div>
    );
}
