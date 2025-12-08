import { Suspense } from "react";
import { AppSidebar } from "./AppSidebar";
import { TaskEditModalWrapper } from "@/components/tasks/TaskEditModalWrapper";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";

import { getLists, getLabels } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";

export async function MainLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();
    const userId = user?.id;

    // If no user, show children without sidebar data (login page will handle redirect)
    if (!userId) {
        return (
            <div className="flex h-screen overflow-hidden bg-background">
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        );
    }

    const [lists, labels] = await Promise.all([
        getLists(userId),
        getLabels(userId)
    ]);

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <AppSidebar lists={lists} labels={labels} user={user} />
            <main className="flex-1 overflow-y-auto pl-10 pr-10">
                {children}
            </main>
            <Suspense fallback={null}>
                <TaskEditModalWrapper />
                <KeyboardShortcuts />
            </Suspense>
        </div>
    );
}
