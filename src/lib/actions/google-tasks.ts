"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db, externalEntityMap, externalIntegrations, externalSyncConflicts, lists, tasks } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { createGoogleTasksClient, getGoogleTasksAccessToken } from "@/lib/google-tasks/service";
import { mapGoogleTaskToLocal, mapLocalTaskToGoogle } from "@/lib/google-tasks/mapper";
import { syncGoogleTasksForUser } from "@/lib/google-tasks/sync";
import { updateTask } from "@/lib/actions/tasks";

export async function syncGoogleTasksNow() {
    if (process.env.NODE_ENV === "test") {
        return { success: true };
    }

    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const result = await syncGoogleTasksForUser(user.id);
    return { success: result.status === "ok", ...result };
}

export async function disconnectGoogleTasks() {
    if (process.env.NODE_ENV === "test") {
        return { success: true };
    }

    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    await db
        .delete(externalIntegrations)
        .where(and(eq(externalIntegrations.userId, user.id), eq(externalIntegrations.provider, "google_tasks")));

    return { success: true };
}

export async function getGoogleTasksStatus() {
    if (process.env.NODE_ENV === "test") {
        return { success: true, connected: false };
    }

    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const integration = await db.query.externalIntegrations.findFirst({
        where: and(eq(externalIntegrations.userId, user.id), eq(externalIntegrations.provider, "google_tasks")),
    });

    return { success: true, connected: Boolean(integration) };
}

export async function getGoogleTasksConflicts() {
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
        .where(
            and(
                eq(externalSyncConflicts.userId, user.id),
                eq(externalSyncConflicts.provider, "google_tasks"),
                eq(externalSyncConflicts.status, "pending")
            )
        )
        .orderBy(externalSyncConflicts.createdAt);

    return { success: true, conflicts };
}

export async function getGoogleTasksMappingData() {
    if (process.env.NODE_ENV === "test") {
        return { success: false, error: "Google Tasks sync disabled in tests." };
    }

    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const integration = await db.query.externalIntegrations.findFirst({
        where: and(eq(externalIntegrations.userId, user.id), eq(externalIntegrations.provider, "google_tasks")),
    });

    if (!integration) {
        return { success: false, error: "Google Tasks integration not connected." };
    }

    const { accessToken } = await getGoogleTasksAccessToken(user.id);
    const client = createGoogleTasksClient(accessToken);

    const [tasklists, userLists, mappings] = await Promise.all([
        client.listTasklists(),
        db.select().from(lists).where(eq(lists.userId, user.id)),
        db
            .select()
            .from(externalEntityMap)
            .where(
                and(
                    eq(externalEntityMap.userId, user.id),
                    eq(externalEntityMap.provider, "google_tasks"),
                    eq(externalEntityMap.entityType, "list")
                )
            ),
    ]);

    return {
        success: true,
        tasklists,
        lists: userLists,
        listMappings: mappings.map((mapping) => ({
            tasklistId: mapping.externalId,
            listId: mapping.localId,
        })),
    };
}

export async function setGoogleTasksListMappings(mappings: { tasklistId: string; listId: number | null }[]) {
    const user = await getCurrentUser();
    if (!user) {
        return { success: false, error: "Not authenticated" };
    }

    const listIds = mappings
        .map((m) => m.listId)
        .filter((id): id is number => id !== null);

    if (listIds.length > 0) {
        const validLists = await db
            .select({ id: lists.id })
            .from(lists)
            .where(and(eq(lists.userId, user.id), inArray(lists.id, listIds)));

        const validListIds = new Set(validLists.map((l) => l.id));
        const invalidIds = listIds.filter((id) => !validListIds.has(id));

        if (invalidIds.length > 0) {
            return { success: false, error: "One or more lists not found or access denied" };
        }
    }

    if (process.env.NODE_ENV === "test") {
        return { success: true };
    }

    await db
        .delete(externalEntityMap)
        .where(and(eq(externalEntityMap.userId, user.id), eq(externalEntityMap.provider, "google_tasks"), eq(externalEntityMap.entityType, "list")));

    if (mappings.length > 0) {
        await db.insert(externalEntityMap).values(
            mappings.map((mapping) => ({
                userId: user.id,
                provider: "google_tasks" as const,
                entityType: "list" as const,
                localId: mapping.listId,
                externalId: mapping.tasklistId,
            }))
        );
    }

    await syncGoogleTasksNow();

    return { success: true };
}

export async function resolveGoogleTasksConflict(conflictId: number, resolution: "local" | "remote") {
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
        where: and(eq(externalIntegrations.userId, user.id), eq(externalIntegrations.provider, "google_tasks")),
    });

    if (!integration) {
        return { success: false, error: "Google Tasks integration not connected." };
    }

    if (resolution === "local") {
        if (!conflict.externalId || !conflict.localId) {
            return { success: false, error: "Missing mapping for conflict resolution." };
        }

        const localTask = await db.query.tasks.findFirst({
            where: and(eq(tasks.id, conflict.localId), eq(tasks.userId, user.id)),
        });

        if (!localTask || !localTask.listId) {
            return { success: false, error: "Local task not found." };
        }

        const listMapping = await db.query.externalEntityMap.findFirst({
            where: and(
                eq(externalEntityMap.userId, user.id),
                eq(externalEntityMap.provider, "google_tasks"),
                eq(externalEntityMap.entityType, "list"),
                eq(externalEntityMap.localId, localTask.listId)
            ),
        });

        if (!listMapping) {
            return { success: false, error: "List mapping not found." };
        }

        const { accessToken } = await getGoogleTasksAccessToken(user.id);
        const client = createGoogleTasksClient(accessToken);
        await client.updateTask(listMapping.externalId, conflict.externalId, mapLocalTaskToGoogle(localTask));
    }

    if (resolution === "remote") {
        if (!conflict.externalPayload || !conflict.localId || !conflict.externalId) {
            return { success: false, error: "Missing payload for conflict resolution." };
        }

        const externalPayload = JSON.parse(conflict.externalPayload) as {
            tasklistId: string;
        };

        if (!externalPayload.tasklistId) {
            return { success: false, error: "Missing tasklist mapping for conflict resolution." };
        }

        const { accessToken } = await getGoogleTasksAccessToken(user.id);
        const client = createGoogleTasksClient(accessToken);
        const remoteTask = await client.getTask(externalPayload.tasklistId, conflict.externalId);

        const listMapping = await db.query.externalEntityMap.findFirst({
            where: and(
                eq(externalEntityMap.userId, user.id),
                eq(externalEntityMap.provider, "google_tasks"),
                eq(externalEntityMap.entityType, "list"),
                eq(externalEntityMap.externalId, externalPayload.tasklistId)
            ),
        });

        if (!listMapping || !listMapping.localId) {
            return { success: false, error: "List mapping not found." };
        }

        const updates = mapGoogleTaskToLocal(remoteTask, listMapping.localId);
        await updateTask(conflict.localId, user.id, {
            title: updates.title,
            description: updates.description ?? null,
            isCompleted: updates.isCompleted ?? false,
            completedAt: updates.isCompleted ? new Date(remoteTask.completed ?? Date.now()) : null,
            dueDate: updates.dueDate ?? null,
            dueDatePrecision: updates.dueDatePrecision ?? null,
            listId: updates.listId ?? listMapping.localId,
        });
    }

    await db
        .update(externalSyncConflicts)
        .set({ status: "resolved", resolution, resolvedAt: new Date() })
        .where(eq(externalSyncConflicts.id, conflictId));

    return { success: true };
}
