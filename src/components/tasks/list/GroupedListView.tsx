
import React from "react";
import { GroupedVirtuoso } from "react-virtuoso";
import { TaskItem } from "../TaskItem";
import { Task } from "@/lib/types";

interface GroupedListViewProps {
    groupedEntries: Array<[string, Task[]]>;
    groupedVirtualSections: any[];
    formattedGroupNames: Map<string, string>;
    listId?: number | null;
    userId?: string;
    onEdit: (task: Task) => void;
    dispatch: any;
    now?: Date;
    isClient?: boolean;
    performanceMode?: boolean;
    userPreferences?: { use24HourClock: boolean, weekStartsOnMonday: boolean };
}

export function GroupedListView({
    groupedEntries, groupedVirtualSections, formattedGroupNames, listId, userId, onEdit, dispatch, now, isClient, performanceMode, userPreferences
}: GroupedListViewProps) {
    const totalGroupTasks = groupedEntries.reduce((acc, [_, tasks]) => acc + tasks.length, 0);

    if (totalGroupTasks > 50) {
        return (
            <GroupedVirtuoso
                useWindowScroll
                groupCounts={groupedVirtualSections.map(s => s.items.length)}
                groupContent={(index) => {
                    const section = groupedVirtualSections[index];
                    return (
                        <h3 className="text-sm font-semibold text-muted-foreground bg-background/95 backdrop-blur-md sticky top-0 py-2 z-10 border-b flex items-center justify-between px-2 -mx-2">
                            <span>{formattedGroupNames.get(section.groupName) ?? section.groupName}</span>
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{section.totalCount}</span>
                        </h3>
                    );
                }}
                itemContent={(index, groupIndex) => {
                    const section = groupedVirtualSections[groupIndex];
                    const item = section?.items[index];
                    if (!item) return null;
                    if (item.type === "separator") return <div className="ml-4 h-px bg-border/50 my-2" />;
                    return (
                        <div className="rounded-lg transition-all">
                            <TaskItem task={item.task} showListInfo={!listId} userId={userId} disableAnimations={true} dispatch={dispatch} onEdit={onEdit} now={now} isClient={isClient} performanceMode={performanceMode} userPreferences={userPreferences} />
                        </div>
                    );
                }}
            />
        );
    }

    return (
        <>
            {groupedEntries.map(([groupName, groupTasks]) => {
                const groupActive: Task[] = [];
                const groupCompleted: Task[] = [];
                for (const task of groupTasks) (task.isCompleted ? groupCompleted : groupActive).push(task);
                return (
                    <div key={groupName} className="space-y-2">
                        <h3 className="text-sm font-semibold text-muted-foreground bg-background/95 backdrop-blur-md sticky top-0 py-2 z-10 border-b flex items-center justify-between px-2 -mx-2">
                            <span>{formattedGroupNames.get(groupName) ?? groupName}</span>
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{groupTasks.length}</span>
                        </h3>
                        {groupActive.map(task => <TaskItem key={task.id} task={task} showListInfo={!listId} userId={userId} disableAnimations={true} dispatch={dispatch} onEdit={onEdit} now={now} isClient={isClient} performanceMode={performanceMode} userPreferences={userPreferences} />)}
                        {groupCompleted.length > 0 && (
                            <>
                                {groupActive.length > 0 && <div className="ml-4 h-px bg-border/50 my-2" />}
                                {groupCompleted.map(task => <TaskItem key={task.id} task={task} showListInfo={!listId} userId={userId} disableAnimations={true} dispatch={dispatch} onEdit={onEdit} now={now} isClient={isClient} performanceMode={performanceMode} userPreferences={userPreferences} />)}
                            </>
                        )}
                    </div>
                );
            })}
        </>
    );
}
