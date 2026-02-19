import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Todo Gemini | Today",
  description: "Manage your tasks efficiently with Todo Gemini."
};

import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { TaskListSkeletonFallback } from "@/components/tasks/TaskListSkeletonFallback";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";
import { redirect } from "next/navigation";
import { getViewSettings } from "@/lib/actions/view-settings";
import { mapDbSettingsToViewSettings } from "@/lib/view-settings";
import { getTasks } from "@/lib/actions/tasks";

async function TodayTaskSection({
    userId,
    defaultDueDate,
}: {
    userId: string;
    defaultDueDate: string;
}) {
    const [tasksResult, dbSettings] = await Promise.all([
        getTasks(userId, null, "today"),
        getViewSettings(userId, "today"),
    ]);
    if (!tasksResult.success) {
        console.error(tasksResult.error.message);
    }
    const tasks = tasksResult.success ? tasksResult.data : [];
    const initialSettings = mapDbSettingsToViewSettings(dbSettings);

    return (
        <TaskListWithSettings
            tasks={tasks}
            defaultDueDate={defaultDueDate}
            viewId="today"
            userId={userId}
            filterType="today"
            initialSettings={initialSettings}
        />
    );
}

export default async function TodayPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }
    const defaultDueDate = new Date().toISOString();

    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Today</h1>
                    <p className="text-muted-foreground">
                        Tasks scheduled for today.
                    </p>
                </div>

                <CreateTaskInput defaultDueDate={defaultDueDate} userId={user.id} />

                <Suspense fallback={<TaskListSkeletonFallback viewId="today" />}>
                    <TodayTaskSection userId={user.id} defaultDueDate={defaultDueDate} />
                </Suspense>
            </div>
        </div>
    );
}
