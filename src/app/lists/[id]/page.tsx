import { getList, getTasks, getViewSettings } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { notFound, redirect } from "next/navigation";
import { getListIcon } from "@/lib/icons";
import { createElement } from "react";
import { defaultViewSettings } from "@/lib/view-settings";

interface ListPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function ListPage({ params }: ListPageProps) {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    const { id } = await params;
    const listId = parseInt(id);
    if (isNaN(listId)) return notFound();

    const [list, tasks, savedSettings] = await Promise.all([
        getList(listId, user.id),
        getTasks(user.id, listId),
        getViewSettings(user.id, `list-${listId}`)
    ]);

    if (!list) return notFound();

    const initialSettings = savedSettings ? {
        layout: savedSettings.layout || defaultViewSettings.layout,
        showCompleted: savedSettings.showCompleted ?? defaultViewSettings.showCompleted,
        groupBy: savedSettings.groupBy || defaultViewSettings.groupBy,
        sortBy: savedSettings.sortBy || defaultViewSettings.sortBy,
        sortOrder: savedSettings.sortOrder || defaultViewSettings.sortOrder,
        filterDate: savedSettings.filterDate || defaultViewSettings.filterDate,
        filterPriority: savedSettings.filterPriority,
        filterLabelId: savedSettings.filterLabelId,
    } : undefined;

    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        {createElement(getListIcon(list.icon), {
                            className: "h-6 w-6",
                            style: { color: list.color || "#000000" }
                        })}
                        {list.name}
                    </h1>
                </div>

                <TaskListWithSettings
                    tasks={tasks}
                    listId={listId}
                    viewId={`list-${listId}`}
                    userId={user.id}
                    initialSettings={initialSettings}
                />
            </div>
        </div>
    );
}
