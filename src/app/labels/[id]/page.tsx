import { Suspense } from "react";
import { getLabel } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { TaskListSkeleton } from "@/components/tasks/TaskListSkeleton";
import { CreateTaskInput } from "@/components/tasks/CreateTaskInput";
import { notFound, redirect } from "next/navigation";
import { ManageLabelDialog } from "@/components/tasks/ManageLabelDialog";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import { ResolvedIcon } from "@/components/ui/resolved-icon";

interface LabelPageProps {
    params: Promise<{
        id: string;
    }>;
}

import { getViewSettings } from "@/lib/actions/view-settings";
import { mapDbSettingsToViewSettings } from "@/lib/view-settings";
import { getTasks } from "@/lib/actions/tasks";

async function LabelTaskSection({
    userId,
    labelId,
}: {
    userId: string;
    labelId: number;
}) {
    const [tasks, dbSettings] = await Promise.all([
        getTasks(userId, undefined, undefined, labelId),
        getViewSettings(userId, `label-${labelId}`),
    ]);
    const initialSettings = mapDbSettingsToViewSettings(dbSettings);

    return (
        <TaskListWithSettings
            tasks={tasks}
            labelId={labelId}
            viewId={`label-${labelId}`}
            userId={userId}
            initialSettings={initialSettings}
        />
    );
}

export default async function LabelPage({ params }: LabelPageProps) {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    const { id } = await params;
    const labelId = parseInt(id);
    if (isNaN(labelId)) return notFound();

    const label = await getLabel(labelId, user.id);

    if (!label) return notFound();

    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <ResolvedIcon icon={label.icon} className="h-6 w-6" color={label.color || undefined} />
                        {label.name}
                        <ManageLabelDialog
                            label={label}
                            userId={user.id}
                            trigger={
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground">
                                    <Settings2 className="h-4 w-4" />
                                    <span className="sr-only">Edit Label</span>
                                </Button>
                            }
                        />
                    </h1>
                    {label.description && (
                        <p className="text-muted-foreground mt-1">
                            {label.description}
                        </p>
                    )}
                </div>

                <CreateTaskInput userId={user.id} defaultLabelIds={[labelId]} />

                <Suspense fallback={<TaskListSkeleton />}>
                    <LabelTaskSection userId={user.id} labelId={labelId} />
                </Suspense>
            </div>
        </div>
    );
}
