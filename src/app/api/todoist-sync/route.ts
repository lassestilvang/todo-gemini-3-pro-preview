import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, externalIntegrations } from "@/db";
import { syncTodoistForUser } from "@/lib/todoist/sync";
import { eq } from "drizzle-orm";
import { constantTimeEqual } from "@/lib/auth-bypass";

export async function GET() {
    const headersList = await headers();
    const cronSecret = process.env.TODOIST_SYNC_SECRET;
    const providedSecret = headersList.get("x-cron-secret");
    const hasCronAccess =
        !!cronSecret &&
        !!providedSecret &&
        constantTimeEqual(providedSecret.trim(), cronSecret);

    if (hasCronAccess) {
        const integrations = await db
            .select({ userId: externalIntegrations.userId })
            .from(externalIntegrations)
            .where(eq(externalIntegrations.provider, "todoist"));

        // Process sequentially to reduce burst rate limits against the Todoist API.
        const results: Array<{ userId: string; result: Awaited<ReturnType<typeof syncTodoistForUser>> }> = [];
        for (const integration of integrations) {
            results.push({
                userId: integration.userId,
                result: await syncTodoistForUser(integration.userId),
            });
        }

        return NextResponse.json({ success: true, results });
    }

    return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
    );
}
