import { and, eq } from "drizzle-orm";
import { db, externalIntegrations, externalSyncConflicts, externalSyncState } from "@/db";
import { decryptToken } from "./crypto";
import { createTodoistClient, fetchTodoistSnapshot } from "./service";

type SyncResult = {
    status: "ok" | "error";
    error?: string;
    conflictCount?: number;
};

export async function syncTodoistForUser(userId: string): Promise<SyncResult> {
    const integration = await db.query.externalIntegrations.findFirst({
        where: and(eq(externalIntegrations.userId, userId), eq(externalIntegrations.provider, "todoist")),
    });

    if (!integration) {
        return { status: "error", error: "Todoist integration not connected." };
    }

    const accessToken = decryptToken({
        ciphertext: integration.accessTokenEncrypted,
        iv: integration.accessTokenIv,
        tag: integration.accessTokenTag,
    });

    const client = createTodoistClient(accessToken);

    await db
        .insert(externalSyncState)
        .values({
            userId,
            provider: "todoist",
            status: "syncing",
            lastSyncedAt: new Date(),
        })
        .onConflictDoUpdate({
            target: [externalSyncState.userId, externalSyncState.provider],
            set: { status: "syncing", lastSyncedAt: new Date() },
        });

    try {
        const snapshot = await fetchTodoistSnapshot(client);

        // TODO: map projects/labels/tasks to local entities and detect changes.
        // TODO: write conflicts to externalSyncConflicts and pause entities accordingly.
        void snapshot;

        await db
            .update(externalSyncState)
            .set({ status: "idle", error: null, lastSyncedAt: new Date() })
            .where(and(eq(externalSyncState.userId, userId), eq(externalSyncState.provider, "todoist")));

        const conflictCount = await db
            .select({ count: externalSyncConflicts.id })
            .from(externalSyncConflicts)
            .where(and(eq(externalSyncConflicts.userId, userId), eq(externalSyncConflicts.status, "pending")));

        return { status: "ok", conflictCount: conflictCount.length };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown Todoist sync error";
        await db
            .update(externalSyncState)
            .set({ status: "error", error: message, lastSyncedAt: new Date() })
            .where(and(eq(externalSyncState.userId, userId), eq(externalSyncState.provider, "todoist")));

        return { status: "error", error: message };
    }
}
