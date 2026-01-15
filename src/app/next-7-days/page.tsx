import { getTasks, getViewSettings } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";
import { redirect } from "next/navigation";
import { defaultViewSettings } from "@/lib/view-settings";

export default async function Next7DaysPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    const tasks = await getTasks(user.id, undefined, "next-7-days");
    const savedSettings = await getViewSettings(user.id, "next-7-days");

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
                    <h1 className="text-3xl font-bold tracking-tight">Next 7 Days</h1>
                    <p className="text-muted-foreground">
                        Tasks scheduled for the next week.
                    </p>
                </div>

                <CreateTaskInput userId={user.id} />

                <TaskListWithSettings
                    tasks={tasks}
                    viewId="next-7-days"
                    userId={user.id}
                    initialSettings={initialSettings}
                />
            </div>
        </div>
    );
}
