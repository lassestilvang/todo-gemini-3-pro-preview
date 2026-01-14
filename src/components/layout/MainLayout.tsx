import { Suspense } from "react";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
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
            <div className="flex h-screen overflow-hidden bg-background" data-testid="app-container">
                <main className="flex-1 overflow-y-auto" data-testid="main-content">
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
        <div className="flex h-screen overflow-hidden bg-background" data-testid="app-container">
            {/* Desktop Sidebar - Hidden on mobile */}
            <AppSidebar
                lists={lists}
                labels={labels}
                user={user}
                className="hidden md:block"
            />

            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Mobile Header - Visible only on mobile */}
                <header className="md:hidden p-4 border-b flex items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 shrink-0">
                    <MobileNav lists={lists} labels={labels} user={user} />
                    <div className="ml-4 font-semibold text-lg">Todo Gemini</div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:pl-10 md:pr-10" data-testid="main-content">
                    {children}
                </main>
            </div>

            <Suspense fallback={null}>
                <TaskEditModalWrapper userId={userId} />
                <KeyboardShortcuts />
            </Suspense>
        </div>
    );
}
