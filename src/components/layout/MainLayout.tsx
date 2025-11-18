import { AppSidebar } from "./AppSidebar";
import { TaskDetailSheet } from "@/components/tasks/TaskDetailSheet";

export function MainLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <AppSidebar />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
            <TaskDetailSheet />
        </div>
    );
}
