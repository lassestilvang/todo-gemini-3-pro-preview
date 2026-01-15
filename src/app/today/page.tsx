import { getTasks, getViewSettings } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";
import { redirect } from "next/navigation";
import { defaultViewSettings } from "@/lib/view-settings";

export default async function TodayPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    const [tasks, savedSettings] = await Promise.all([
        getTasks(user.id, undefined, "today"),
        getViewSettings(user.id, "today")
    ]);

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
                    <h1 className="text-3xl font-bold tracking-tight">Today</h1>
                    <p className="text-muted-foreground">
                        Tasks scheduled for today.
                    </p>
                </div>

                <CreateTaskInput defaultDueDate={new Date().toISOString()} userId={user.id} />

                <TaskListWithSettings
                    tasks={tasks}
                    defaultDueDate={new Date().toISOString()}
                    viewId="today"
                    userId={user.id}
                    initialSettings={initialSettings}
                />
            </div>
        </div>
    );
}
