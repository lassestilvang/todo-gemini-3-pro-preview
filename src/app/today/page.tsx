import { getTasks } from "@/lib/actions";
import { TaskList } from "@/components/tasks/TaskList";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";

export default async function TodayPage() {
    const tasks = await getTasks(undefined, "today");

    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Today</h1>
                    <p className="text-muted-foreground">
                        Tasks scheduled for today.
                    </p>
                </div>

                <CreateTaskInput defaultDueDate={new Date().toISOString()} />

                <TaskList tasks={tasks} defaultDueDate={new Date().toISOString()} />
            </div>
        </div>
    );
}
