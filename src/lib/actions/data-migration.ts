"use server";

import { db } from "@/db"
import {
    lists, labels, tasks, taskLabels, reminders, templates, savedViews,
    viewSettings
} from "@/db/schema"
import { getCurrentUser } from "@/lib/auth"
import { and, eq, inArray, sql } from "drizzle-orm"
import type { NeonHttpQueryResult } from "drizzle-orm/neon-http"
import { z } from "zod"
import { revalidatePath, revalidateTag } from "next/cache"

// Schema for validation
const BackupSchema = z.object({
    version: z.number(),
    timestamp: z.string(),
    data: z.object({
        lists: z.array(z.any()),
        labels: z.array(z.any()),
        tasks: z.array(z.any()),
        taskLabels: z.array(z.any()),
        reminders: z.array(z.any()),
        templates: z.array(z.any()),
        savedViews: z.array(z.any()),
        viewSettings: z.array(z.any()),
    })
})

export type UserBackupData = z.infer<typeof BackupSchema>

export async function exportUserData() {
    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")

    const userId = user.id

    // Fetch all user data
    const [
        userLists,
        userLabels,
        userTasks,
        userTemplates,
        userSavedViews,
        userViewSettings
    ] = await Promise.all([
        db.select().from(lists).where(eq(lists.userId, userId)),
        db.select().from(labels).where(eq(labels.userId, userId)),
        db.select().from(tasks).where(eq(tasks.userId, userId)),
        db.select().from(templates).where(eq(templates.userId, userId)),
        db.select().from(savedViews).where(eq(savedViews.userId, userId)),
        db.select().from(viewSettings).where(eq(viewSettings.userId, userId)),
    ])

    // Get task IDs to fetch related data
    const taskIds = userTasks.map(t => t.id)

    let userTaskLabels: { taskId: number; labelId: number }[] = []
    let userReminders: unknown[] = []

    if (taskIds.length > 0) {
        // Fetch task-related data
        // Note: Drizzle optimized query for "inArray"
        userTaskLabels = await db
            .select({
                taskId: taskLabels.taskId,
                labelId: taskLabels.labelId
            })
            .from(taskLabels)
            .innerJoin(tasks, eq(taskLabels.taskId, tasks.id))
            .where(eq(tasks.userId, userId))

        userReminders = await db
            .select()
            .from(reminders)
            .innerJoin(tasks, eq(reminders.taskId, tasks.id))
            .where(eq(tasks.userId, userId))
            .then(rows => rows.map(r => r.reminders))
    }

    const backup: UserBackupData = {
        version: 1,
        timestamp: new Date().toISOString(),
        data: {
            lists: userLists,
            labels: userLabels,
            tasks: userTasks,
            taskLabels: userTaskLabels,
            reminders: userReminders,
            templates: userTemplates,
            savedViews: userSavedViews,
            viewSettings: userViewSettings,
        }
    }

    return backup
}

export async function importUserData(jsonData: unknown) {
    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")

    const userId = user.id

    // Validate Schema
    const result = BackupSchema.safeParse(jsonData)
    if (!result.success) {
        throw new Error("Invalid backup file format")
    }

    const { data } = result.data

    // ID Mapping Maps: Old ID -> New ID
    const listMap = new Map<number, number>()
    const labelMap = new Map<number, number>()
    const taskMap = new Map<number, number>()

    const batchInsert = async <T>(
        values: T[],
        insertFn: (batch: T[]) => Promise<NeonHttpQueryResult<unknown>>,
        batchSize = 500
    ): Promise<void> => {
        // ⚡ Bolt Opt: Chunk inserts to keep SQL payloads small while reducing roundtrips.
        for (let i = 0; i < values.length; i += batchSize) {
            await insertFn(values.slice(i, i + batchSize))
        }
    }

    try {
        // 1. Import Lists
        console.log('[Import] Starting import...');
        const importStamp = Date.now()
        const listSlugMap = new Map<string, number>()
        const listValues = data.lists.map((list) => {
            const slug = `${list.slug}-imported-${importStamp}-${list.id}`
            listSlugMap.set(slug, list.id)
            return {
                ...list,
                id: undefined, // Let DB generate new ID
                userId: userId, // Ensure it belongs to current user
                slug, // Avoid slug collision while keeping old->new mapping
                createdAt: new Date(list.createdAt),
                updatedAt: new Date(),
            }
        })

        if (listValues.length > 0) {
            // ⚡ Bolt Opt: Batch list inserts while preserving old->new ID mapping via slug.
            for (let i = 0; i < listValues.length; i += 500) {
                const batch = listValues.slice(i, i + 500)
                const insertedLists = await db
                    .insert(lists)
                    .values(batch)
                    .returning({ id: lists.id, slug: lists.slug })

                for (const row of insertedLists) {
                    const oldId = listSlugMap.get(row.slug)
                    if (oldId !== undefined) {
                        listMap.set(oldId, row.id)
                    }
                }
            }
        }

        // 2. Import Labels
        const labelKeyFor = (label: {
            name: string
            color: string | null
            icon: string | null
            description: string | null
            position: number
        }) =>
            JSON.stringify([
                label.name,
                label.color,
                label.icon,
                label.description,
                label.position,
            ])

        const labelValues = data.labels.map((label) => ({
            ...label,
            id: undefined,
            userId: userId,
        }))

        if (labelValues.length > 0) {
            const labelKeyMap = new Map<string, number[]>()
            for (const label of data.labels) {
                const key = labelKeyFor({
                    name: label.name,
                    color: label.color ?? null,
                    icon: label.icon ?? null,
                    description: label.description ?? null,
                    position: label.position ?? 0,
                })
                const queue = labelKeyMap.get(key) ?? []
                queue.push(label.id)
                labelKeyMap.set(key, queue)
            }

            // ⚡ Bolt Opt: Batch label inserts and map old->new IDs via a stable content key.
            for (let i = 0; i < labelValues.length; i += 500) {
                const batch = labelValues.slice(i, i + 500)
                const insertedLabels = await db
                    .insert(labels)
                    .values(batch)
                    .returning({
                        id: labels.id,
                        name: labels.name,
                        color: labels.color,
                        icon: labels.icon,
                        description: labels.description,
                        position: labels.position,
                    })

                for (const row of insertedLabels) {
                    const key = labelKeyFor({
                        name: row.name,
                        color: row.color ?? null,
                        icon: row.icon ?? null,
                        description: row.description ?? null,
                        position: row.position,
                    })
                    const queue = labelKeyMap.get(key)
                    const oldId = queue?.shift()
                    if (oldId !== undefined) {
                        labelMap.set(oldId, row.id)
                    }
                }
            }
        }

        // 3. Import Tasks
        const taskValues = data.tasks.map((task) => {
            const newListId = task.listId ? listMap.get(task.listId) : null
            return {
                oldId: task.id,
                value: {
                    ...task,
                    id: undefined,
                    userId: userId,
                    listId: newListId,
                    parentId: null, // Set null initially to avoid FK errors
                    dueDate: task.dueDate ? new Date(task.dueDate) : null,
                    createdAt: new Date(task.createdAt),
                    updatedAt: new Date(),
                    completedAt: task.completedAt ? new Date(task.completedAt) : null,
                    deadline: task.deadline ? new Date(task.deadline) : null,
                },
            }
        })

        if (taskValues.length > 0) {
            // ⚡ Bolt Opt: Batch task inserts and map old->new IDs by insert order.
            // Postgres returns INSERT ... RETURNING rows in the VALUES order.
            for (let i = 0; i < taskValues.length; i += 500) {
                const batch = taskValues.slice(i, i + 500)
                const insertedTasks = await db
                    .insert(tasks)
                    .values(batch.map((item) => item.value))
                    .returning({ id: tasks.id })

                for (let j = 0; j < insertedTasks.length; j += 1) {
                    const oldId = batch[j]?.oldId
                    if (oldId !== undefined) {
                        taskMap.set(oldId, insertedTasks[j].id)
                    }
                }
            }
        }

        // 3b. Update Parent IDs
        const parentUpdates = data.tasks
            .map((task) => {
                if (!task.parentId) return null
                const newParentId = taskMap.get(task.parentId)
                const newTaskId = taskMap.get(task.id)
                return newParentId && newTaskId ? { id: newTaskId, parentId: newParentId } : null
            })
            .filter((update): update is { id: number; parentId: number } => update !== null)

        if (parentUpdates.length > 0) {
            // ⚡ Bolt Opt: Single batched UPDATE replaces N per-task updates.
            const taskIds = parentUpdates.map((update) => update.id)
            const caseWhen = sql.join(
                parentUpdates.map(
                    (update) => sql`WHEN ${tasks.id} = ${update.id} THEN ${update.parentId}`
                ),
                sql` `
            )

            await db
                .update(tasks)
                .set({
                    parentId: sql`CASE ${caseWhen} ELSE ${tasks.parentId} END`,
                })
                .where(and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)))
        }

        // 4. Import Task Labels
        const taskLabelValues = data.taskLabels
            .map((tl) => {
                const newTaskId = taskMap.get(tl.taskId)
                const newLabelId = labelMap.get(tl.labelId)
                return newTaskId && newLabelId ? { taskId: newTaskId, labelId: newLabelId } : null
            })
            .filter((value): value is { taskId: number; labelId: number } => value !== null)

        if (taskLabelValues.length > 0) {
            // ⚡ Bolt Opt: Batch insert reduces task label writes to a handful of queries.
            await batchInsert(taskLabelValues, (batch) =>
                db.insert(taskLabels).values(batch).onConflictDoNothing()
            )
        }

        // 5. Import Reminders
        const reminderValues = data.reminders
            .map((r) => {
                const newTaskId = taskMap.get(r.taskId)
                if (!newTaskId) return null
                return {
                    ...r,
                    id: undefined,
                    taskId: newTaskId,
                    remindAt: new Date(r.remindAt),
                    createdAt: new Date(r.createdAt),
                }
            })
            .filter((value): value is typeof data.reminders[number] & { taskId: number } => value !== null)

        if (reminderValues.length > 0) {
            // ⚡ Bolt Opt: Batch reminder inserts to avoid per-row roundtrips.
            await batchInsert(reminderValues, (batch) => db.insert(reminders).values(batch))
        }

        // 6. Import Templates
        const templateValues = data.templates.map((t) => ({
            ...t,
            id: undefined,
            userId: userId,
            createdAt: new Date(t.createdAt),
            updatedAt: new Date(),
        }))

        if (templateValues.length > 0) {
            // ⚡ Bolt Opt: Batch template inserts to cut import latency.
            await batchInsert(templateValues, (batch) => db.insert(templates).values(batch))
        }

        // 7. Import Saved Views
        const savedViewValues = data.savedViews.map((sv) => ({
            ...sv,
            id: undefined,
            userId: userId,
            createdAt: new Date(sv.createdAt),
        }))

        if (savedViewValues.length > 0) {
            // ⚡ Bolt Opt: Batch saved view inserts to reduce total queries.
            await batchInsert(savedViewValues, (batch) => db.insert(savedViews).values(batch))
        }

        revalidateTag(`lists-${userId}`, 'max');
        revalidateTag(`labels-${userId}`, 'max');
        revalidatePath("/", "layout");
        return {
            success: true, counts: {
                lists: listMap.size,
                tasks: taskMap.size,
                labels: labelMap.size
            }
        }
    } catch (error) {
        console.error('[Import] Failed:', error);
        return { success: false, error: 'Import failed' };
    }
}
