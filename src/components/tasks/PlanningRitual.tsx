"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sunrise, Sunset, CheckCircle2, Target, ArrowRight } from "lucide-react";
import { getTasks } from "@/lib/actions";

interface TaskType {
    id: number;
    title: string;
    isCompleted: boolean | null;
    priority: string | null;
}

interface PlanningRitualProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    type: "morning" | "evening";
    userId?: string;
}

export function PlanningRitual({ open, onOpenChange, type, userId }: PlanningRitualProps) {
    const [todayTasks, setTodayTasks] = useState<TaskType[]>([]);
    const [priorities, setPriorities] = useState<string[]>(["", "", ""]);
    const [reflection, setReflection] = useState("");
    const [step, setStep] = useState(1);

    useEffect(() => {
        const loadTodayTasks = async () => {
            if (!userId) return;
            const tasksResult = await getTasks(userId, undefined, "today");
            if (!tasksResult.success) {
                console.error(tasksResult.error.message);
                setTodayTasks([]);
                return;
            }
            setTodayTasks(tasksResult.data as TaskType[]);
        };

        if (open) {
            loadTodayTasks();
            setStep(1);
            setPriorities(["", "", ""]);
            setReflection("");
        }
    }, [open, userId]);

    // PERF: Cache completed tasks to avoid repeated filtering in render.
    const completedTasks = useMemo(
        () => todayTasks.filter(t => t.isCompleted),
        [todayTasks]
    );
    const completedCount = completedTasks.length;
    const totalCount = todayTasks.length;

    if (type === "morning") {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sunrise className="h-5 w-5 text-orange-500" />
                            Morning Planning Ritual
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Plan your day to stay productive.
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[500px] pr-4">
                        {step === 1 && (
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-medium mb-2">Today&apos;s Tasks ({totalCount})</h3>
                                    <div className="space-y-2">
                                        {todayTasks.length === 0 ? (
                                            <p className="text-sm text-muted-foreground">No tasks scheduled for today</p>
                                        ) : (
                                            todayTasks.map(task => (
                                                <div key={task.id} className="flex items-center gap-2 text-sm border p-2 rounded">
                                                    <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                                                    {task.title}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                                <Button onClick={() => setStep(2)} className="w-full">
                                    Set Priorities
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Target className="h-5 w-5 text-blue-500" />
                                        <h3 className="font-medium">What are your top 3 priorities today?</h3>
                                    </div>
                                    {[0, 1, 2].map(i => (
                                        <div key={i} className="mb-3">
                                            <label className="text-sm font-medium mb-1 block">Priority #{i + 1}</label>
                                            <Textarea
                                                value={priorities[i]}
                                                onChange={(e) => {
                                                    const newP = [...priorities];
                                                    newP[i] = e.target.value;
                                                    setPriorities(newP);
                                                }}
                                                placeholder={`Your ${["first", "second", "third"][i]} priority...`}
                                                className="min-h-[60px]"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                                    <Button onClick={() => onOpenChange(false)} className="flex-1">
                                        Start Your Day! 🚀
                                    </Button>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        );
    }

    // Evening ritual
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sunset className="h-5 w-5 text-purple-500" />
                        Evening Review
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Review your day and reflect on your progress.
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[500px] pr-4">
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 p-4 rounded-lg border">
                                <h3 className="font-medium mb-2">Today&apos;s Progress</h3>
                                <p className="text-3xl font-bold">{completedCount} / {totalCount}</p>
                                <p className="text-sm text-muted-foreground">tasks completed</p>
                            </div>

                            <div>
                                <h3 className="font-medium mb-2">Completed Tasks</h3>
                                <div className="space-y-2">
                                    {completedTasks.length === 0 ? (
                                        <p className="text-sm text-muted-foreground">No tasks completed today</p>
                                    ) : (
                                        completedTasks.map(task => (
                                            <div key={task.id} className="flex items-center gap-2 text-sm border p-2 rounded bg-green-500/5">
                                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                {task.title}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <Button onClick={() => setStep(2)} className="w-full">
                                Reflect on Your Day
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-medium mb-2">Daily Reflection</h3>
                                <Textarea
                                    value={reflection}
                                    onChange={(e) => setReflection(e.target.value)}
                                    placeholder="What went well today? What could be improved? What did you learn?"
                                    className="min-h-[150px]"
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                                <Button onClick={() => onOpenChange(false)} className="flex-1">
                                    Finish Day 🌙
                                </Button>
                            </div>
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
