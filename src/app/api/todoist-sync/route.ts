import { NextResponse } from "next/server";
import { db, externalIntegrations } from "@/db";
import { syncTodoistForUser } from "@/lib/todoist/sync";
import { eq } from "drizzle-orm";

export async function GET() {
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
