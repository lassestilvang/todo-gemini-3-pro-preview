
import React, { useMemo } from "react";
import { GroupedVirtuoso } from "react-virtuoso";
import { TaskItem } from "../TaskItem";
import { Task } from "@/lib/types";
import { ActionType, actionRegistry } from "@/lib/sync/registry";

type GroupedVirtualItem = { type: "task"; task: Task } | { type: "separator" };

export interface GroupedVirtualSection {
    groupName: string;
    totalCount: number;
    items: GroupedVirtualItem[];
}

type SyncDispatch = <T extends ActionType>(type: T, ...args: Parameters<typeof actionRegistry[T]>) => Promise<{ success: boolean; data: unknown }>;

interface GroupedListViewProps {
    groupedEntries: Array<[string, Task[]]>;
    groupedVirtualSections: GroupedVirtualSection[];
    formattedGroupNames: Map<string, string>;
    listId?: number | null;
    userId?: string;
    onEdit: (task: Task) => void;
    dispatch: SyncDispatch;
    now?: Date;
    isClient?: boolean;
    performanceMode?: boolean;
    userPreferences?: { use24HourClock: boolean, weekStartsOnMonday: boolean };
}

export function GroupedListView({
    groupedEntries, groupedVirtualSections, formattedGroupNames, listId, userId, onEdit, dispatch, now, isClient, performanceMode, userPreferences
}: GroupedListViewProps) {
    // ⚡ Bolt Opt: Replaced .map() and .reduce() with for loops to avoid O(N) array allocation
    const groupCounts = useMemo(() => {
        const counts = new Array<number>(groupedVirtualSections.length);
        for (let i = 0; i < groupedVirtualSections.length; i++) {
            counts[i] = groupedVirtualSections[i].items.length;
        }
        return counts;
    }, [groupedVirtualSections]);

    const { groupedSplit, totalGroupTasks } = useMemo(() => {
        const split = new Array<{ groupName: string; groupTasks: Task[]; groupActive: Task[]; groupCompleted: Task[] }>(groupedEntries.length);
        let total = 0;
        for (let i = 0; i < groupedEntries.length; i++) {
            const [groupName, groupTasks] = groupedEntries[i];
            total += groupTasks.length;
            const groupActive: Task[] = [];
            const groupCompleted: Task[] = [];
            for (let j = 0; j < groupTasks.length; j++) {
                const task = groupTasks[j];
                if (task) (task.isCompleted ? groupCompleted : groupActive).push(task);
            }
            split[i] = { groupName, groupTasks, groupActive, groupCompleted };
        }
        return { groupedSplit: split, totalGroupTasks: total };
    }, [groupedEntries]);

    if (totalGroupTasks > 50) {
        return (
            <GroupedVirtuoso
                useWindowScroll
                groupCounts={groupCounts}
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
            {groupedSplit.map(({ groupName, groupTasks, groupActive, groupCompleted }: { groupName: string, groupTasks: Task[], groupActive: Task[], groupCompleted: Task[] }) => {
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
