"use server"

import { db } from "@/db"
import {
    lists, labels, tasks, taskLabels, reminders, templates, savedViews, users,
    achievements, userAchievements, viewSettings
} from "@/db/schema"
import { getCurrentUser } from "@/lib/auth"
import { eq, and } from "drizzle-orm"
import { z } from "zod"
import { revalidatePath } from "next/cache"

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

    let userTaskLabels: any[] = []
    let userReminders: any[] = []

    if (taskIds.length > 0) {
        // Fetch task-related data
        // Note: Drizzle optimized query for "inArray"
        userTaskLabels = await db.select().from(taskLabels).where(
            // We can't easily filter task_labels by userId directly as it's a join table without userId
            // So we filter by tasks that belong to the user.
            // However, for simplicity in export/import, we can filter by matching taskIds in memory 
            // OR join. Since we already have taskIds, let's fetch all relevant taskLabels
            // But simpler: just select * from taskLabels where taskId in taskIds
            undefined
        )

        // Workaround: We need to filter taskLabels and reminders by the tasks we just fetched
        // Since `inArray` can be slow with thousands of IDs, we'll do joins if needed, 
        // but for personal todo app, fetching directly is likely fine.
        // Let's use a simpler approach: 
        // We will fetch ALL taskLabels and filter in memory if the dataset is small, 
        // OR better: use `inArray` if supported properly.
        // Given Drizzle complexity with `inArray` on many rows, let's try to query with join.

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

    try {
        // 1. Import Lists
        console.log('[Import] Starting import...');
        for (const list of data.lists) {
            const [newList] = await db.insert(lists).values({
                ...list,
                id: undefined, // Let DB generate new ID
                userId: userId, // Ensure it belongs to current user
                slug: `${list.slug}-imported-${Date.now()}`, // Avoid slug collision
                createdAt: new Date(list.createdAt),
                updatedAt: new Date(),
            }).returning({ id: lists.id })

            listMap.set(list.id, newList.id)
        }

        // 2. Import Labels
        for (const label of data.labels) {
            const [newLabel] = await db.insert(labels).values({
                ...label,
                id: undefined,
                userId: userId,
            }).returning({ id: labels.id })

            labelMap.set(label.id, newLabel.id)
        }

        // 3. Import Tasks
        for (const task of data.tasks) {
            const newListId = task.listId ? listMap.get(task.listId) : null

            const [newTask] = await db.insert(tasks).values({
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
            }).returning({ id: tasks.id })

            taskMap.set(task.id, newTask.id)
        }

        // 3b. Update Parent IDs
        for (const task of data.tasks) {
            if (task.parentId) {
                const newParentId = taskMap.get(task.parentId)
                const newTaskId = taskMap.get(task.id)

                if (newParentId && newTaskId) {
                    await db.update(tasks)
                        .set({ parentId: newParentId })
                        .where(eq(tasks.id, newTaskId))
                }
            }
        }

        // 4. Import Task Labels
        for (const tl of data.taskLabels) {
            const newTaskId = taskMap.get(tl.taskId)
            const newLabelId = labelMap.get(tl.labelId)

            if (newTaskId && newLabelId) {
                await db.insert(taskLabels).values({
                    taskId: newTaskId,
                    labelId: newLabelId
                }).onConflictDoNothing()
            }
        }

        // 5. Import Reminders
        for (const r of data.reminders) {
            const newTaskId = taskMap.get(r.taskId)
            if (newTaskId) {
                await db.insert(reminders).values({
                    ...r,
                    id: undefined,
                    taskId: newTaskId,
                    remindAt: new Date(r.remindAt),
                    createdAt: new Date(r.createdAt)
                })
            }
        }

        // 6. Import Templates
        for (const t of data.templates) {
            await db.insert(templates).values({
                ...t,
                id: undefined,
                userId: userId,
                createdAt: new Date(t.createdAt),
                updatedAt: new Date()
            })
        }

        // 7. Import Saved Views
        for (const sv of data.savedViews) {
            await db.insert(savedViews).values({
                ...sv,
                id: undefined,
                userId: userId,
                createdAt: new Date(sv.createdAt)
            })
        }

        // revalidatePath("/")
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
