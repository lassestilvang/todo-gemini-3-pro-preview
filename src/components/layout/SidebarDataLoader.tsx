import { getLists, getLabels } from "@/lib/actions";
import { AppSidebar } from "./AppSidebar";
import { SidebarWrapper } from "./SidebarWrapper";
import { AuthUser } from "@/lib/auth";

export async function SidebarDataLoader({ user, className, mobile }: { user: AuthUser, className?: string, mobile?: boolean }) {
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

    if (mobile) {
        return (
            <AppSidebar
                id="app-sidebar-mobile"
                className={className}
                lists={lists}
                labels={labels}
                user={user}
            />
        );
    }

    return (
        <SidebarWrapper className={className} lists={lists} labels={labels}>
            <AppSidebar
                id="app-sidebar"
                lists={lists}
                labels={labels}
                user={user}
            />
        </SidebarWrapper>
    );
}
