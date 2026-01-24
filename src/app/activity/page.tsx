import { getActivityLog } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ActivityLogContent } from "@/components/activity/ActivityLogContent";
import { startOfDay, endOfDay, parseISO } from "date-fns";

interface PageProps {
    searchParams: Promise<{
        query?: string;
        type?: "task" | "list" | "label" | "all";
        from?: string;
        to?: string;
    }>;
}

export default async function ActivityLogPage({ searchParams }: PageProps) {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    const { query, type, from, to } = await searchParams;

    // Parse dates properly - from should be start of day, to should be end of day
    const fromDate = from ? startOfDay(parseISO(from)) : undefined;
    const toDate = to ? endOfDay(parseISO(to)) : undefined;

    const logs = await getActivityLog(user.id, {
        query,
        type,
        from: fromDate,
        to: toDate,
    });

    return (
        <div className="flex flex-col h-full p-8 overflow-hidden bg-background">
            <ActivityLogContent
                initialLogs={logs as any}
                userId={user.id}
                use24h={user.use24HourClock}
            />
        </div>
    );
}

