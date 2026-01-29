import { getCurrentUser } from "@/lib/auth";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";
import { redirect } from "next/navigation";
import { type Task } from "@/lib/types";
import { getViewSettings } from "@/lib/actions/view-settings";
import { mapDbSettingsToViewSettings } from "@/lib/view-settings";
import { getTasks } from "@/lib/actions/tasks";

export default async function TodayPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    // Restore blocking data fetch
    const tasks = await getTasks(user.id, null, "today");

    // Fetch view settings on server to prevent flash
    const dbSettings = await getViewSettings(user.id, "today");
    const initialSettings = mapDbSettingsToViewSettings(dbSettings);

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
                    filterType="today"
                    initialSettings={initialSettings}
                />
            </div>
        </div>
    );
}
