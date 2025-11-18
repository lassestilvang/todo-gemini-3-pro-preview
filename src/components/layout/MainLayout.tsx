import { Suspense } from "react";
import { AppSidebar } from "./AppSidebar";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";

import { getLists, getLabels } from "@/lib/actions";

export async function MainLayout({ children }: { children: React.ReactNode }) {
    const [lists, labels] = await Promise.all([
        getLists(),
        getLabels()
    ]);

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <AppSidebar lists={lists} labels={labels} />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
            <Suspense fallback={null}>
                <TaskDetailSheet />
            </Suspense>
        </div>
    );
}
