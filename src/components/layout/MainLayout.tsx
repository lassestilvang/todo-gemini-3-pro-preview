import { Suspense } from "react";
import { MobileNav } from "./MobileNav";
import { TaskEditModalWrapper } from "@/components/tasks/TaskEditModalWrapper";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { ZenOverlay } from "@/components/tasks/ZenOverlay";
import { QuickCapture } from "@/components/tasks/QuickCapture";
import { OnboardingTour } from "@/components/layout/OnboardingTour";
import { SidebarDataLoader } from "./SidebarDataLoader";
import { getCurrentUser } from "@/lib/auth";
import { SyncStatus } from "@/components/sync/SyncStatus";

const SidebarFallback = () => (
    <div className="hidden md:flex flex-col w-64 h-full border-r bg-card/50 backdrop-blur-xl shrink-0">
        <div className="h-full w-full animate-pulse bg-muted/10" />
    </div>
);

import { UserProvider } from "@/components/providers/UserProvider";
import { DataLoader } from "@/components/providers/data-loader";

export async function MainLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();
    const userId = user?.id;

    // If no user, show children without sidebar data (login page will handle redirect)
    if (!userId || !user) {
        return (
            <div className="flex h-[100dvh] overflow-hidden bg-background" data-testid="app-container">
                <main className="flex-1 overflow-y-auto" data-testid="main-content">
                    {children}
                </main>
            </div>
        );
    }

    return (
        <UserProvider userId={userId} use24HourClock={user.use24HourClock ?? null} weekStartsOnMonday={user.weekStartsOnMonday ?? null}>
            <DataLoader userId={userId} />
            <div className="flex h-[100dvh] overflow-hidden bg-background" data-testid="app-container">
                {/* Desktop Sidebar - Hidden on mobile */}
                <Suspense fallback={<SidebarFallback />}>
                    <SidebarDataLoader
                        user={user}
                        className="hidden md:flex"
                    />
                </Suspense>

                <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* Mobile Header - Visible only on mobile */}
                    <header className="md:hidden px-4 pb-4 pt-[calc(1rem+env(safe-area-inset-top))] border-b flex items-center bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 shrink-0">
                        <MobileNav>
                            <Suspense fallback={<div className="w-full h-full bg-sidebar animate-pulse" />}>
                                <SidebarDataLoader user={user} className="w-full h-full border-none shadow-none" />
                            </Suspense>
                        </MobileNav>
                        <div className="ml-4 font-semibold text-lg flex-1">Todo Gemini</div>
                        <SyncStatus />
                    </header>

                    {/* Desktop Sync Status - Fixed position */}
                    <div className="hidden md:block fixed top-4 right-4 z-50">
                        <SyncStatus />
                    </div>

                    <main className="flex-1 overflow-y-auto px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pl-10 md:pr-10" data-testid="main-content">
                        {children}
                    </main>
                </div>

                <Suspense fallback={null}>
                    <ZenOverlay>{children}</ZenOverlay>
                    <TaskEditModalWrapper userId={userId} />
                    <KeyboardShortcuts />
                    <OnboardingTour />
                    <QuickCapture userId={userId} />
                </Suspense>
            </div>
        </UserProvider>
    );
}
