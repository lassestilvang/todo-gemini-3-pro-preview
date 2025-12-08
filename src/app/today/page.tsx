import { getTasks } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";
import { redirect } from "next/navigation";

export default async function TodayPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    const tasks = await getTasks(user.id, undefined, "today");

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
                />
            </div>
        </div>
    );
}
