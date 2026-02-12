import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { TaskListSkeletonFallback } from "@/components/tasks/TaskListSkeletonFallback";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";
import { redirect } from "next/navigation";
import { getViewSettings } from "@/lib/actions/view-settings";
import { mapDbSettingsToViewSettings } from "@/lib/view-settings";
import { getTasks } from "@/lib/actions/tasks";

async function UpcomingTaskSection({ userId }: { userId: string }) {
    const [tasksResult, dbSettings] = await Promise.all([
        getTasks(userId, null, "upcoming"),
        getViewSettings(userId, "upcoming"),
    ]);
    if (!tasksResult.success) {
        console.error(tasksResult.error.message);
    }
    const tasks = tasksResult.success ? tasksResult.data : [];
    const initialSettings = mapDbSettingsToViewSettings(dbSettings);

    return (
        <TaskListWithSettings
            tasks={tasks}
            viewId="upcoming"
            userId={userId}
            filterType="upcoming"
            initialSettings={initialSettings}
        />
    );
}

export default async function UpcomingPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Upcoming</h1>
                    <p className="text-muted-foreground">
                        Tasks scheduled for the future.
                    </p>
                </div>

                <CreateTaskInput userId={user.id} />

                <Suspense fallback={<TaskListSkeletonFallback viewId="upcoming" />}>
                    <UpcomingTaskSection userId={user.id} />
                </Suspense>
            </div>
        </div>
    );
}
