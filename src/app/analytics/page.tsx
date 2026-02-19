import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Todo Gemini | Analytics",
  description: "Manage your tasks efficiently with Todo Gemini."
};

import { getAnalytics } from "@/lib/analytics";
import { getCurrentUser } from "@/lib/auth";
import dynamic from "next/dynamic";
const AnalyticsCharts = dynamic(() => import("@/components/analytics/AnalyticsCharts").then(mod => mod.AnalyticsCharts), {
    loading: () => <div className="h-96 w-full animate-pulse bg-muted rounded-lg" />,
});
const WeeklyReview = dynamic(() => import("@/components/analytics/WeeklyReview").then(mod => mod.WeeklyReview), {
    loading: () => <div className="h-48 w-full animate-pulse bg-muted rounded-lg" />,
});
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

            <WeeklyReview />
            <AnalyticsCharts data={data} />
        </div>
    );
}
