import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, externalIntegrations } from "@/db";
import { syncGoogleTasksForUser } from "@/lib/google-tasks/sync";
import { eq } from "drizzle-orm";
import { constantTimeEqual } from "@/lib/auth-bypass";
import pLimit from "p-limit";

export async function GET() {
    const headersList = await headers();
    const cronSecret = process.env.GOOGLE_TASKS_SYNC_SECRET;
    const providedSecret = headersList.get("x-cron-secret");
    const hasCronAccess =
        !!cronSecret &&
        !!providedSecret &&
        constantTimeEqual(providedSecret.trim(), cronSecret);

    if (hasCronAccess) {
        const integrations = await db
            .select({ userId: externalIntegrations.userId })
            .from(externalIntegrations)
            .where(eq(externalIntegrations.provider, "google_tasks"));

        // ⚡ Bolt Opt: Bounded concurrency (limit 5) significantly reduces total execution time from O(N) latency while respecting external API burst rate limits.
        // It maximizes throughput compared to manual chunking by keeping exactly 5 operations running at all times.
        const limit = pLimit(5);
        const results = await Promise.all(
            integrations.map((integration) =>
                limit(async () => ({
                    userId: integration.userId,
                    result: await syncGoogleTasksForUser(integration.userId),
                }))
            )
        );

        return NextResponse.json({ success: true, results });
    }

    return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
    );
}
