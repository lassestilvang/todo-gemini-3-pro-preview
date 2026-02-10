import { getLists, getLabels } from "@/lib/actions";
import { AppSidebar } from "./AppSidebar";
import { AuthUser } from "@/lib/auth";

export async function SidebarDataLoader({ user, className }: { user: AuthUser, className?: string }) {
    const [lists, labels] = await Promise.all([
        getLists(user.id).catch(error => {
            console.error("Failed to fetch lists:", error);
            return [];
        }),
        getLabels(user.id).catch(error => {
            console.error("Failed to fetch labels:", error);
            return [];
        })
    ]);

    return (
        <AppSidebar
            id="app-sidebar"
            className={className}
            lists={lists}
            labels={labels}
            user={user}
        />
    );
}
