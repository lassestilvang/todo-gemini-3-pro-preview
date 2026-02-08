import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { TaskListSkeleton } from "@/components/tasks/TaskListSkeleton";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";
import { redirect } from "next/navigation";

import { getViewSettings } from "@/lib/actions/view-settings";
import { mapDbSettingsToViewSettings } from "@/lib/view-settings";
import { getTasks } from "@/lib/actions/tasks";

async function AllTasksSection({ userId }: { userId: string }) {
    const [tasks, dbSettings] = await Promise.all([
        getTasks(userId, undefined, "all"),
        getViewSettings(userId, "all"),
    ]);
    const initialSettings = mapDbSettingsToViewSettings(dbSettings);

    return (
        <TaskListWithSettings
            tasks={tasks}
            viewId="all"
            userId={userId}
            filterType="all"
            initialSettings={initialSettings}
        />
    );
}

export default async function AllTasksPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">All Tasks</h1>
                    <p className="text-muted-foreground">
                        Every task in your database.
                    </p>
                </div>

                <CreateTaskInput userId={user.id} />

                <Suspense fallback={<TaskListSkeleton />}>
                    <AllTasksSection userId={user.id} />
                </Suspense>
            </div>
        </div>
    );
}
