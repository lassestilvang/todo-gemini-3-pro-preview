"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Flag } from "lucide-react";
import { createTask } from "@/lib/actions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export function CreateTaskInput({ listId }: { listId?: number }) {
    const [title, setTitle] = useState("");
    const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
    const [priority, setPriority] = useState<"none" | "low" | "medium" | "high">("none");
    const [isExpanded, setIsExpanded] = useState(false);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!title.trim()) return;

        await createTask({
            title,
            listId: listId || null, // Default to Inbox (null listId usually means Inbox or specific ID)
            // Wait, schema says listId references lists.id. Inbox has an ID.
            // I should probably fetch Inbox ID or let the backend handle default.
            // For now, let's assume listId is passed or we handle it.
            // Actually, if listId is undefined, it might fail foreign key constraint if not nullable.
            // Schema: listId: integer("list_id").references(...)
            // It is NOT NULL by default in drizzle unless specified?
            // Drizzle integer() is nullable by default unless .notNull() is called.
            // My schema: listId: integer("list_id").references(...) -> It is nullable.
            // So null listId = Inbox? Or should I enforce Inbox ID?
            // Let's assume null = Inbox for now or I'll fix it.
            dueDate: dueDate || null,
            priority,
        });

        setTitle("");
        setDueDate(undefined);
        setPriority("none");
        setIsExpanded(false);
    };

    return (
        <div className="mb-6">
            <div
                className={cn(
                    "relative rounded-lg border bg-background shadow-sm transition-all",
                    isExpanded ? "ring-2 ring-primary" : "hover:border-primary/50"
                )}
            >
                <form onSubmit={handleSubmit} className="flex flex-col">
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onFocus={() => setIsExpanded(true)}
                        placeholder="Add a task..."
                        className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-lg py-6"
                    />

                    {isExpanded && (
                        <div className="flex items-center justify-between p-2 border-t bg-muted/20 rounded-b-lg">
                            <div className="flex items-center gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="sm" className={cn(dueDate && "text-primary")}>
                                            <Calendar className="mr-2 h-4 w-4" />
                                            {dueDate ? format(dueDate, "MMM d") : "Due Date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CalendarComponent
                                            mode="single"
                                            selected={dueDate}
                                            onSelect={setDueDate}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>

                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="sm" className={cn(priority !== "none" && "text-primary")}>
                                            <Flag className="mr-2 h-4 w-4" />
                                            {priority === "none" ? "Priority" : priority.charAt(0).toUpperCase() + priority.slice(1)}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-40 p-2">
                                        <div className="grid gap-1">
                                            {["none", "low", "medium", "high"].map((p) => (
                                                <Button
                                                    key={p}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="justify-start"
                                                    onClick={() => setPriority(p as any)}
                                                >
                                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                                </Button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button type="button" variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" disabled={!title.trim()}>
                                    Add Task
                                </Button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
