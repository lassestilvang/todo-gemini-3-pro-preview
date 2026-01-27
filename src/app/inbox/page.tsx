import { getCurrentUser } from "@/lib/auth";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";
import { redirect } from "next/navigation";


export default async function InboxPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    // OPTIM: Removed blocking data fetch to solve "Slow Navigation"
    // The data is now hydrated by DataLoader (root) or cached in Global Store.
    // We pass [] to allow instant mount, then Store hydrates.
    const tasks: any[] = [];

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

                <TaskListWithSettings
                    tasks={tasks}
                    viewId="inbox"
                    userId={user.id}
                    filterType="inbox"
                />
            </div>
        </div>
    );
}
