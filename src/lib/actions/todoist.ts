"use server";

import { and, eq } from "drizzle-orm";
import { db, externalEntityMap, externalIntegrations, lists } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { encryptToken } from "@/lib/todoist/crypto";
import { syncTodoistForUser } from "@/lib/todoist/sync";
import { createTodoistClient } from "@/lib/todoist/service";
import type { TodoistLabel, TodoistProject } from "@/lib/todoist/types";

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

export async function getTodoistMappingData() {
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const integration = await db.query.externalIntegrations.findFirst({
        where: and(eq(externalIntegrations.userId, user.id), eq(externalIntegrations.provider, "todoist")),
    });

    if (!integration) {
        return { success: false, error: "Todoist integration not connected." };
    }

    const { decryptToken } = await import("@/lib/todoist/crypto");
    const accessToken = decryptToken({
        ciphertext: integration.accessTokenEncrypted,
        iv: integration.accessTokenIv,
        tag: integration.accessTokenTag,
    });

    const client = createTodoistClient(accessToken);
    const [projects, labels, userLists, mappings] = await Promise.all([
        client.getProjects(),
        client.getLabels(),
        db.select().from(lists).where(eq(lists.userId, user.id)),
        db
            .select()
            .from(externalEntityMap)
            .where(and(eq(externalEntityMap.userId, user.id), eq(externalEntityMap.provider, "todoist"))),
    ]);

    return {
        success: true,
        projects: (projects as TodoistProject[]).slice(0, 5),
        labels: labels as TodoistLabel[],
        lists: userLists,
        projectMappings: mappings
            .filter((mapping) => mapping.entityType === "list")
            .map((mapping) => ({
                projectId: mapping.externalId,
                listId: mapping.localId,
            })),
        labelMappings: mappings
            .filter((mapping) => mapping.entityType === "list_label")
            .map((mapping) => ({
                labelId: mapping.externalId,
                listId: mapping.localId,
            })),
    };
}

export async function setTodoistProjectMappings(mappings: { projectId: string; listId: number | null }[]) {
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    await db
        .delete(externalEntityMap)
        .where(and(eq(externalEntityMap.userId, user.id), eq(externalEntityMap.provider, "todoist"), eq(externalEntityMap.entityType, "list")));

    if (mappings.length > 0) {
        await db.insert(externalEntityMap).values(
            mappings.map((mapping) => ({
                userId: user.id,
                provider: "todoist",
                entityType: "list",
                localId: mapping.listId,
                externalId: mapping.projectId,
            }))
        );
    }

    return { success: true };
}

export async function setTodoistLabelMappings(mappings: { labelId: string; listId: number | null }[]) {
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    await db
        .delete(externalEntityMap)
        .where(and(eq(externalEntityMap.userId, user.id), eq(externalEntityMap.provider, "todoist"), eq(externalEntityMap.entityType, "list_label")));

    const filtered = mappings.filter((mapping) => mapping.listId);
    if (filtered.length > 0) {
        await db.insert(externalEntityMap).values(
            filtered.map((mapping) => ({
                userId: user.id,
                provider: "todoist",
                entityType: "list_label",
                localId: mapping.listId,
                externalId: mapping.labelId,
            }))
        );
    }

    return { success: true };
}
