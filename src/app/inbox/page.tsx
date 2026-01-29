import { getCurrentUser } from "@/lib/auth";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";
import { redirect } from "next/navigation";
import { type Task } from "@/lib/types";
import { getViewSettings } from "@/lib/actions/view-settings";
import { mapDbSettingsToViewSettings } from "@/lib/view-settings";

import { getTasks } from "@/lib/actions/tasks";

export default async function InboxPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    // Restore blocking fetch to ensure tasks appear.
    // Optimization can be revisited if navigation is too slow.
    const tasks = await getTasks(user.id, null);

    // Fetch view settings on server to prevent flash
    const dbSettings = await getViewSettings(user.id, "inbox");
    const initialSettings = mapDbSettingsToViewSettings(dbSettings);

    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
                    <p className="text-muted-foreground">
                        Tasks that need to be sorted.
                    </p>
                </div>

                <CreateTaskInput userId={user.id} />

                <TaskListWithSettings
                    tasks={tasks}
                    viewId="inbox"
                    userId={user.id}
                    filterType="inbox"
                    initialSettings={initialSettings}
                />
            </div>
        </div>
    );
}
