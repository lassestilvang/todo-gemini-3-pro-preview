import { getLabel, getTasks } from "@/lib/actions";
import { TaskList } from "@/components/tasks/TaskList";
import { notFound } from "next/navigation";
import { Hash } from "lucide-react";

interface LabelPageProps {
    params: Promise<{
        id: string;
    }>;
}

export default async function LabelPage({ params }: LabelPageProps) {
    const { id } = await params;
    const labelId = parseInt(id);
    if (isNaN(labelId)) return notFound();

    const [label, tasks] = await Promise.all([
        getLabel(labelId),
        getTasks(undefined, undefined, labelId)
    ]);

    if (!label) return notFound();

    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Hash className="h-6 w-6" style={{ color: label.color || "#000000" }} />
                        {label.name}
                    </h1>
                </div>

                <TaskList tasks={tasks} />
            </div>
        </div>
    );
}
