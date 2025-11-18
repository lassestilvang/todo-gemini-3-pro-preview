import { getTasks } from "@/lib/actions";
import { TaskList } from "@/components/tasks/TaskList";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";

export default async function UpcomingPage() {
    const tasks = await getTasks(undefined, "upcoming");

    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Upcoming</h1>
                    <p className="text-muted-foreground">
                        Tasks scheduled for the future.
                    </p>
                </div>

                <CreateTaskInput />

                <TaskList tasks={tasks} />
            </div>
        </div>
    );
}
