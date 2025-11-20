import { getAnalytics } from "@/lib/analytics";
import { AnalyticsCharts } from "@/components/analytics/AnalyticsCharts";
import { WeeklyReview } from "@/components/analytics/WeeklyReview";

export default async function AnalyticsPage() {
    const data = await getAnalytics();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
                <p className="text-muted-foreground">Track your productivity and progress.</p>
            </div>

            <WeeklyReview />
            <AnalyticsCharts data={data} />
        </div>
    );
}
