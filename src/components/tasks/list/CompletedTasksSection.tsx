
import React from "react";
import { Virtuoso } from "react-virtuoso";
import { TaskItem } from "../TaskItem";
import { Task } from "@/lib/types";

interface CompletedTasksSectionProps {
    tasks: Task[];
    listId?: number | null;
    userId?: string;
    onEdit: (task: Task) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dispatch: any;
    now?: Date;
    isClient?: boolean;
    performanceMode?: boolean;
    userPreferences?: { use24HourClock: boolean, weekStartsOnMonday: boolean };
}

export function CompletedTasksSection({
    tasks, listId, userId, onEdit, dispatch, now, isClient, performanceMode, userPreferences
}: CompletedTasksSectionProps) {
    if (tasks.length === 0) return null;

    return (
        <div className="space-y-4 pt-2">
            <h3 className="text-sm font-semibold text-muted-foreground bg-background/95 backdrop-blur-md sticky top-0 py-2 z-10 border-b flex items-center justify-between px-2 -mx-2 mb-2">
                <span>Completed</span>
                <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{tasks.length}</span>
            </h3>
            {tasks.length > 50 ? (
                <Virtuoso
                    useWindowScroll
                    data={tasks}
                    itemContent={(_, task) => (
                        <div className="rounded-lg transition-all">
                            <TaskItem task={task} showListInfo={!listId} userId={userId} disableAnimations={true} dispatch={dispatch} onEdit={onEdit} now={now} isClient={isClient} performanceMode={performanceMode} userPreferences={userPreferences} />
                        </div>
                    )}
                />
            ) : (
                <div className="space-y-2">
                    {tasks.map((task) => (
                        <div key={task.id} className="rounded-lg transition-all">
                            <TaskItem task={task} showListInfo={!listId} userId={userId} disableAnimations={true} dispatch={dispatch} onEdit={onEdit} now={now} isClient={isClient} performanceMode={performanceMode} userPreferences={userPreferences} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
