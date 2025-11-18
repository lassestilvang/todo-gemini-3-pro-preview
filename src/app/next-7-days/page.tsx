import { getTasks } from "@/lib/actions";
import { TaskList } from "@/components/tasks/TaskList";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";

export default async function Next7DaysPage() {
    const tasks = await getTasks(undefined, "next-7-days");

    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Next 7 Days</h1>
                    <p className="text-muted-foreground">
                        Tasks scheduled for the next week.
                    </p>
                </div>

                <CreateTaskInput />

                <TaskList tasks={tasks} />
            </div>
        </div>
    );
}
