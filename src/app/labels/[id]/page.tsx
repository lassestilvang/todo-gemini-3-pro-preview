import { getLabel, getTasks } from "@/lib/actions";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { notFound } from "next/navigation";
import { getLabelIcon } from "@/lib/icons";
import { createElement } from "react";

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
                        {createElement(getLabelIcon(label.icon), {
                            className: "h-6 w-6",
                            style: { color: label.color || "#000000" }
                        })}
                        {label.name}
                    </h1>
                </div>

                <TaskListWithSettings tasks={tasks} labelId={labelId} viewId={`label-${labelId}`} />
            </div>
        </div>
    );
}

