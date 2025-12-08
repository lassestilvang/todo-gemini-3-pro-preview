import { getAnalytics } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
import { WeeklyReview } from "@/components/analytics/WeeklyReview";
import { redirect } from "next/navigation";

export default async function AnalyticsPage() {
    const user = await getCurrentUser();
    if (!user) {
        redirect("/login");
    }

    const data = await getAnalytics(user.id);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
                <p className="text-muted-foreground">Track your productivity and progress.</p>
            </div>

            <WeeklyReview userId={user.id} />
            <AnalyticsCharts data={data} />
        </div>
    );
}
