import { getTasks } from "@/lib/actions";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";

export default async function AllTasksPage() {
    const tasks = await getTasks(undefined, "all");

    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">All Tasks</h1>
                    <p className="text-muted-foreground">
                        Every task in your database.
                    </p>
                </div>

                <CreateTaskInput />

                <TaskListWithSettings tasks={tasks} viewId="all" />
            </div>
        </div>
    );
}

