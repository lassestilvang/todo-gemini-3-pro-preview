"use server";

import { and, eq } from "drizzle-orm";
import { db, externalIntegrations } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { encryptToken } from "@/lib/todoist/crypto";
import { syncTodoistForUser } from "@/lib/todoist/sync";

export async function connectTodoist(token: string) {
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const encrypted = encryptToken(token.trim());

    await db
        .insert(externalIntegrations)
        .values({
            userId: user.id,
            provider: "todoist",
            accessTokenEncrypted: encrypted.ciphertext,
            accessTokenIv: encrypted.iv,
            accessTokenTag: encrypted.tag,
        })
        .onConflictDoUpdate({
            target: [externalIntegrations.userId, externalIntegrations.provider],
            set: {
                accessTokenEncrypted: encrypted.ciphertext,
                accessTokenIv: encrypted.iv,
                accessTokenTag: encrypted.tag,
                updatedAt: new Date(),
            },
        });

    return { success: true };
}

export async function disconnectTodoist() {
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    await db
        .delete(externalIntegrations)
        .where(and(eq(externalIntegrations.userId, user.id), eq(externalIntegrations.provider, "todoist")));

    return { success: true };
}

export async function syncTodoistNow() {
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const result = await syncTodoistForUser(user.id);
    return { success: result.status === "ok", ...result };
}
