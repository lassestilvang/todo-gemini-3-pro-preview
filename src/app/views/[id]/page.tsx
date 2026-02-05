import { db, savedViews } from "@/db";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { TaskListWithSettings } from "@/components/tasks/TaskListWithSettings";
import { redirect, notFound } from "next/navigation";
import { type ViewSettings } from "@/lib/view-settings";
import { Task } from "@/lib/types";

export default async function SavedViewPage({ params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    const { id } = await params;
    const viewId = parseInt(id);
    if (isNaN(viewId)) {
        notFound();
    }

    const view = await db.query.savedViews.findFirst({
        where: and(eq(savedViews.id, viewId), eq(savedViews.userId, user.id)),
    });

    if (!view) {
        notFound();
    }

    const settings = JSON.parse(view.settings) as ViewSettings;

    // Fetch tasks based on settings
    // This is simplified; true complex filtering might need a dedicated action
    // But for now, we'll fetch all tasks and let the client-side filtering handle it
    // just like Inbox/Today does.
    // OPTIM: Hydrate from client store
    const tasks: Task[] = [];

    return (
        <div className="container max-w-4xl py-6 lg:py-10">
            <div className="flex flex-col gap-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{view.name}</h1>
                    <p className="text-muted-foreground">
                        Custom view: {view.name}
                    </p>
                </div>

                <TaskListWithSettings
                    tasks={tasks}
                    viewId={`view-${view.id}`}
                    userId={user.id}
                    initialSettings={settings}
                />
            </div>
        </div>
    );
}
