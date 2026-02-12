import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db, externalIntegrations } from "@/db";
import { syncTodoistForUser } from "@/lib/todoist/sync";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
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

        const results = await Promise.all(
            integrations.map(async (integration) => ({
                userId: integration.userId,
                result: await syncTodoistForUser(integration.userId),
            }))
        );

        return NextResponse.json({ success: true, results });
    }

    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json(
            { success: false, error: "Not authenticated" },
            { status: 401 }
        );
    }

    const result = await syncTodoistForUser(user.id);
    return NextResponse.json({ success: result.status === "ok", result });
}
