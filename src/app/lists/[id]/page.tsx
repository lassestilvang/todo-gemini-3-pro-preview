import { getList, getTasks } from "@/lib/actions";
import { TaskList } from "@/components/tasks/TaskList";
import { notFound } from "next/navigation";

interface ListPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function ListPage({ params }: ListPageProps) {
    const { id } = await params;
    const listId = parseInt(id);
    if (isNaN(listId)) return notFound();

    const [list, tasks] = await Promise.all([
        getList(listId),
        getTasks(listId)
    ]);

    if (!list) return notFound();

    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <div
                            className="h-6 w-6 rounded-full"
                            style={{ backgroundColor: list.color || "#000000" }}
                        />
                        {list.name}
                    </h1>
                </div>

                <TaskList tasks={tasks} />
            </div>
        </div>
    );
}
