"use server";

import { and, eq } from "drizzle-orm";
import { db, externalEntityMap, externalIntegrations, externalSyncConflicts, tasks } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import { createGoogleTasksClient, getGoogleTasksAccessToken } from "@/lib/google-tasks/service";
import { mapGoogleTaskToLocal, mapLocalTaskToGoogle } from "@/lib/google-tasks/mapper";
import { syncGoogleTasksForUser } from "@/lib/google-tasks/sync";
import { updateTask } from "@/lib/actions/tasks";
import type { GoogleTask } from "@/lib/google-tasks/types";

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
        if (!conflict.externalPayload || !conflict.localId) {
            return { success: false, error: "Missing payload for conflict resolution." };
        }

        const externalPayload = JSON.parse(conflict.externalPayload) as {
            title: string;
            notes?: string | null;
            status: "needsAction" | "completed";
            due?: string | null;
            completed?: string | null;
            listId: number;
            tasklistId: string;
        };

        const remoteTask: GoogleTask = {
            id: conflict.externalId ?? "",
            title: externalPayload.title,
            notes: externalPayload.notes ?? undefined,
            status: externalPayload.status,
            due: externalPayload.due ?? undefined,
            completed: externalPayload.completed ?? undefined,
        };

        const updates = mapGoogleTaskToLocal(remoteTask, externalPayload.listId);
        await updateTask(conflict.localId, user.id, {
            title: updates.title,
            description: updates.description ?? null,
            isCompleted: updates.isCompleted ?? false,
            completedAt: updates.isCompleted ? new Date(externalPayload.completed ?? Date.now()) : null,
            dueDate: updates.dueDate ?? null,
            dueDatePrecision: updates.dueDatePrecision ?? null,
            listId: updates.listId ?? externalPayload.listId,
        });
    }

    await db
        .update(externalSyncConflicts)
        .set({ status: "resolved", resolution, resolvedAt: new Date() })
        .where(eq(externalSyncConflicts.id, conflictId));

    return { success: true };
}
