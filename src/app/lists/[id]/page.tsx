import { getList } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";
import { notFound, redirect } from "next/navigation";
import { ManageListDialog } from "@/components/tasks/ManageListDialog";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { ResolvedIcon } from "@/components/ui/resolved-icon";

interface ListPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function ListPage({ params }: ListPageProps) {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    const { id } = await params;
    const listId = parseInt(id);
    if (isNaN(listId)) return notFound();

    // Blocking List Fetch (Fast, single row) needed for Title/404
    const list = await getList(listId, user.id);
    if (!list) return notFound();

    // OPTIM: Removed blocking task fetch
    const tasks: any[] = [];

    // We can't easily skip getViewSettings if we want initialSettings passed.
    // BUT we can make it hydrating too.
    const initialSettings = undefined;

    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <ResolvedIcon icon={list.icon} className="h-6 w-6" color={list.color || undefined} />
                        {list.name}
                        <ManageListDialog
                            list={list}
                            userId={user.id}
                            trigger={
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                                    <Settings2 className="h-4 w-4" />
                                    <span className="sr-only">Edit List</span>
                                </Button>
                            }
                        />
                    </h1>
                    {list.description && (
                        <p className="text-muted-foreground mt-1">
                            {list.description}
                        </p>
                    )}
                </div>

                <CreateTaskInput listId={listId} userId={user.id} />

                <TaskListWithSettings
                    tasks={tasks}
                    listId={listId}
                    viewId={`list-${listId}`}
                    userId={user.id}
                    initialSettings={initialSettings}
                />
            </div>
        </div>
    );
}
