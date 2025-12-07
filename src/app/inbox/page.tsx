import { getTasks } from "@/lib/actions";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";


export default async function InboxPage() {
    const tasks = await getTasks(null, "all"); // Filter by inbox (no list)

    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inbox</h1>
                    <p className="text-muted-foreground">
                        Tasks that need to be sorted.
                    </p>
                </div>

                <TaskListWithSettings tasks={tasks} viewId="inbox" />
            </div>
        </div>
    );
}

