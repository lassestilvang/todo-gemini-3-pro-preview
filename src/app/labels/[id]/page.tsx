import { getLabel, getTasks, getViewSettings } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";
import { notFound, redirect } from "next/navigation";
import { getLabelIcon } from "@/lib/icons";
import { createElement } from "react";
import { defaultViewSettings } from "@/lib/view-settings";

interface LabelPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function LabelPage({ params }: LabelPageProps) {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    const { id } = await params;
    const labelId = parseInt(id);
    if (isNaN(labelId)) return notFound();

    const [label, tasks, savedSettings] = await Promise.all([
        getLabel(labelId, user.id),
        getTasks(user.id, undefined, undefined, labelId),
        getViewSettings(user.id, `label-${labelId}`)
    ]);

    if (!label) return notFound();

    const initialSettings = savedSettings ? {
        layout: savedSettings.layout || defaultViewSettings.layout,
        showCompleted: savedSettings.showCompleted ?? defaultViewSettings.showCompleted,
        groupBy: savedSettings.groupBy || defaultViewSettings.groupBy,
        sortBy: savedSettings.sortBy || defaultViewSettings.sortBy,
        sortOrder: savedSettings.sortOrder || defaultViewSettings.sortOrder,
        filterDate: savedSettings.filterDate || defaultViewSettings.filterDate,
        filterPriority: savedSettings.filterPriority,
        filterLabelId: savedSettings.filterLabelId,
        filterEnergyLevel: savedSettings.filterEnergyLevel ?? defaultViewSettings.filterEnergyLevel,
        filterContext: savedSettings.filterContext ?? defaultViewSettings.filterContext,
    } : undefined;

    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        {createElement(getLabelIcon(label.icon), {
                            className: "h-6 w-6",
                            style: { color: label.color || "#000000" }
                        })}
                        {label.name}
                    </h1>
                </div>

                <CreateTaskInput userId={user.id} defaultLabelIds={[labelId]} />

                <TaskListWithSettings
                    tasks={tasks}
                    labelId={labelId}
                    viewId={`label-${labelId}`}
                    userId={user.id}
                    initialSettings={initialSettings}
                />
            </div>
        </div>
    );
}
