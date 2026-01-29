import { getCurrentUser } from "@/lib/auth";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";
import { redirect } from "next/navigation";


import { type Task } from "@/lib/types";

export default async function UpcomingPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    // OPTIM: Removed blocking data fetch to solve "Slow Navigation"
    const tasks: Task[] = [];

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

                <TaskListWithSettings
                    tasks={tasks}
                    viewId="upcoming"
                    userId={user.id}
                    filterType="upcoming"
                />
            </div>
        </div>
    );
}
