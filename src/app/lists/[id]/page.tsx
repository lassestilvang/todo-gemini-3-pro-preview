import { getList, getTasks } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { notFound, redirect } from "next/navigation";
import { getListIcon } from "@/lib/icons";
import { createElement } from "react";

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

    const [list, tasks] = await Promise.all([
        getList(listId, user.id),
        getTasks(user.id, listId)
    ]);

    if (!list) return notFound();

    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        {createElement(getListIcon(list.icon), {
                            className: "h-6 w-6",
                            style: { color: list.color || "#000000" }
                        })}
                        {list.name}
                    </h1>
                </div>

                <TaskListWithSettings tasks={tasks} listId={listId} viewId={`list-${listId}`} userId={user.id} />
            </div>
        </div>
    );
}
