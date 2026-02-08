import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { TaskListSkeleton } from "@/components/tasks/TaskListSkeleton";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";
import { redirect } from "next/navigation";
import { getViewSettings } from "@/lib/actions/view-settings";
import { mapDbSettingsToViewSettings } from "@/lib/view-settings";

import { getTasks } from "@/lib/actions/tasks";

async function InboxTaskSection({ userId }: { userId: string }) {
    const [tasks, dbSettings] = await Promise.all([
        getTasks(userId, null),
        getViewSettings(userId, "inbox"),
    ]);
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

                <Suspense fallback={<TaskListSkeleton />}>
                    <InboxTaskSection userId={user.id} />
                </Suspense>
            </div>
        </div>
    );
}
