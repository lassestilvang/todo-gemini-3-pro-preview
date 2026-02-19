import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Todo Gemini | Inbox",
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

async function InboxTaskSection({ userId }: { userId: string }) {
    const [tasksResult, dbSettings] = await Promise.all([
        getTasks(userId, null),
        getViewSettings(userId, "inbox"),
    ]);
    if (!tasksResult.success) {
        console.error(tasksResult.error.message);
    }
    const tasks = tasksResult.success ? tasksResult.data : [];
    const initialSettings = mapDbSettingsToViewSettings(dbSettings);

    return (
        <TaskListWithSettings
            tasks={tasks}
            viewId="inbox"
            userId={userId}
            filterType="inbox"
            initialSettings={initialSettings}
        />
    );
}

export default async function InboxPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

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

                <Suspense fallback={<TaskListSkeletonFallback viewId="inbox" />}>
                    <InboxTaskSection userId={user.id} />
                </Suspense>
            </div>
        </div>
    );
}
