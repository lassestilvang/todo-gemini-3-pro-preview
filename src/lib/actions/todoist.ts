"use server";

import { and, eq } from "drizzle-orm";
import { db, externalEntityMap, externalIntegrations, externalSyncConflicts, lists, tasks } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { encryptToken } from "@/lib/todoist/crypto";
import { syncTodoistForUser } from "@/lib/todoist/sync";
import { createTodoistClient } from "@/lib/todoist/service";
import type { TodoistLabel, TodoistProject } from "@/lib/todoist/types";
import { mapLocalTaskToTodoist, mapTodoistTaskToLocal } from "@/lib/todoist/mapper";
import { resolveTodoistTaskListId } from "@/lib/todoist/mapping";
import { updateTask } from "@/lib/actions/tasks";

export async function connectTodoist(token: string) {
    if (process.env.NODE_ENV === "test") {
        return { success: true };
    }

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
    if (process.env.NODE_ENV === "test") {
        return { success: true };
    }

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
    if (process.env.NODE_ENV === "test") {
        return { success: true };
    }

    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const result = await syncTodoistForUser(user.id);
    return { success: result.status === "ok", ...result };
}

export async function getTodoistMappingData() {
    if (process.env.NODE_ENV === "test") {
        return { success: false, error: "Todoist sync disabled in tests." };
    }

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
    if (process.env.NODE_ENV === "test") {
        return { success: true };
    }

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

    await syncTodoistNow();

    return { success: true };
}

export async function setTodoistLabelMappings(mappings: { labelId: string; listId: number | null }[]) {
    if (process.env.NODE_ENV === "test") {
        return { success: true };
    }

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

    await syncTodoistNow();

    return { success: true };
}

export async function getTodoistConflicts() {
    if (process.env.NODE_ENV === "test") {
        return { success: true, conflicts: [] };
    }

    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const conflicts = await db
        .select()
        .from(externalSyncConflicts)
        .where(and(eq(externalSyncConflicts.userId, user.id), eq(externalSyncConflicts.status, "pending")))
        .orderBy(externalSyncConflicts.createdAt);

    return { success: true, conflicts };
}

export async function resolveTodoistConflict(conflictId: number, resolution: "local" | "remote") {
    if (process.env.NODE_ENV === "test") {
        return { success: true };
    }

    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const conflict = await db.query.externalSyncConflicts.findFirst({
        where: and(eq(externalSyncConflicts.id, conflictId), eq(externalSyncConflicts.userId, user.id)),
    });

    if (!conflict || conflict.status !== "pending") {
        return { success: false, error: "Conflict not found or already resolved." };
    }

    if (conflict.entityType !== "task") {
        return { success: false, error: "Only task conflicts can be resolved for now." };
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

    if (resolution === "local") {
        if (!conflict.externalId || !conflict.localId) {
            return { success: false, error: "Missing mapping for conflict resolution." };
        }

        const localTask = await db.query.tasks.findFirst({
            where: and(eq(tasks.id, conflict.localId), eq(tasks.userId, user.id)),
        });

        if (!localTask) {
            return { success: false, error: "Local task not found." };
        }

        const entityMappings = await db
            .select()
            .from(externalEntityMap)
            .where(and(eq(externalEntityMap.userId, user.id), eq(externalEntityMap.provider, "todoist")));
        const listLabelMappings = entityMappings.filter((mapping) => mapping.entityType === "list_label");
        const mappingState = {
            projects: entityMappings
                .filter((mapping) => mapping.entityType === "list")
                .map((mapping) => ({ projectId: mapping.externalId, listId: mapping.localId })),
            labels: listLabelMappings.map((mapping) => ({ labelId: mapping.externalId, listId: mapping.localId })),
        };

        const payload = mapLocalTaskToTodoist(localTask, mappingState);
        await client.updateTask(conflict.externalId, payload);

        if (localTask.isCompleted) {
            await client.closeTask(conflict.externalId);
        } else {
            await client.reopenTask(conflict.externalId);
        }
    }

    if (resolution === "remote") {
        if (!conflict.externalId || !conflict.localId) {
            return { success: false, error: "Missing mapping for conflict resolution." };
        }

        const entityMappings = await db
            .select()
            .from(externalEntityMap)
            .where(and(eq(externalEntityMap.userId, user.id), eq(externalEntityMap.provider, "todoist")));
        const labelMappings = entityMappings.filter((mapping) => mapping.entityType === "label");
        const listLabelMappings = entityMappings.filter((mapping) => mapping.entityType === "list_label");
        const mappingState = {
            projects: entityMappings
                .filter((mapping) => mapping.entityType === "list")
                .map((mapping) => ({ projectId: mapping.externalId, listId: mapping.localId })),
            labels: listLabelMappings.map((mapping) => ({ labelId: mapping.externalId, listId: mapping.localId })),
        };

        const remoteTask = await client.getTasks().then((tasks) =>
            (tasks as { id: string }[]).find((task) => task.id === conflict.externalId)
        );
        if (!remoteTask) {
            return { success: false, error: "Remote task not found." };
        }

        const localUpdates = mapTodoistTaskToLocal(remoteTask as never, mappingState);
        const resolvedListId = resolveTodoistTaskListId(remoteTask as never, mappingState);
        const labelIdMap = new Map(labelMappings.map((mapping) => [mapping.externalId, mapping.localId]));
        const labelIds = (remoteTask as { labels?: string[] }).labels
            ? (remoteTask as { labels?: string[] }).labels
                  ?.map((labelId) => labelIdMap.get(labelId))
                  .filter((id): id is number => Boolean(id))
            : [];

        await updateTask(
            conflict.localId,
            user.id,
            {
                title: localUpdates.title,
                description: localUpdates.description ?? null,
                isCompleted: localUpdates.isCompleted ?? false,
                completedAt: localUpdates.isCompleted ? new Date() : null,
                dueDate: localUpdates.dueDate ?? null,
                dueDatePrecision: localUpdates.dueDatePrecision ?? null,
                listId: resolvedListId,
                labelIds,
            }
        );
    }

    await db
        .update(externalSyncConflicts)
        .set({ status: "resolved", resolution, resolvedAt: new Date() })
        .where(eq(externalSyncConflicts.id, conflictId));

    return { success: true };
}
