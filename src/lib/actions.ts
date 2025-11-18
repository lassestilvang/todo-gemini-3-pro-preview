"use server";

import { db } from "@/db";
import { lists, tasks, labels, taskLogs, taskLabels } from "@/db/schema";
import { eq, and, desc, gte, lte, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { startOfDay, endOfDay, addDays } from "date-fns";

// --- Lists ---

export async function getLists() {
    return await db.select().from(lists).orderBy(lists.createdAt);
}

export async function getList(id: number) {
    const result = await db.select().from(lists).where(eq(lists.id, id));
    return result[0];
}

export async function createList(data: typeof lists.$inferInsert) {
    await db.insert(lists).values(data);
    revalidatePath("/");
}

export async function updateList(id: number, data: Partial<typeof lists.$inferInsert>) {
    await db.update(lists).set(data).where(eq(lists.id, id));
    revalidatePath("/");
}

export async function deleteList(id: number) {
    await db.delete(lists).where(eq(lists.id, id));
    revalidatePath("/");
}

// --- Labels ---

export async function getLabels() {
    return await db.select().from(labels);
}

export async function getLabel(id: number) {
    const result = await db.select().from(labels).where(eq(labels.id, id));
    return result[0];
}

export async function createLabel(data: typeof labels.$inferInsert) {
    await db.insert(labels).values(data);
    revalidatePath("/");
}

export async function updateLabel(id: number, data: Partial<typeof labels.$inferInsert>) {
    await db.update(labels).set(data).where(eq(labels.id, id));
    revalidatePath("/");
}

export async function deleteLabel(id: number) {
    await db.delete(labels).where(eq(labels.id, id));
    revalidatePath("/");
}

// --- Tasks ---

export async function getTasks(listId?: number, filter?: "today" | "upcoming" | "all" | "completed" | "next-7-days", labelId?: number) {
    const conditions = [];

    if (listId) {
        conditions.push(eq(tasks.listId, listId));
    }

    if (labelId) {
        const taskIdsWithLabel = await db
            .select({ taskId: taskLabels.taskId })
            .from(taskLabels)
            .where(eq(taskLabels.labelId, labelId));

        const ids = taskIdsWithLabel.map(t => t.taskId);
        if (ids.length > 0) {
            conditions.push(inArray(tasks.id, ids));
        } else {
            return []; // No tasks with this label
        }
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    if (filter === "today") {
        conditions.push(
            and(
                gte(tasks.dueDate, todayStart),
                lte(tasks.dueDate, todayEnd)
            )
        );
    } else if (filter === "upcoming") {
        conditions.push(gte(tasks.dueDate, todayStart));
    } else if (filter === "next-7-days") {
        const nextWeek = addDays(now, 7);
        conditions.push(
            and(
                gte(tasks.dueDate, todayStart),
                lte(tasks.dueDate, nextWeek)
            )
        );
    }

    const tasksResult = await db.select({
        id: tasks.id,
        listId: tasks.listId,
        title: tasks.title,
        description: tasks.description,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        isCompleted: tasks.isCompleted,
        completedAt: tasks.completedAt,
        isRecurring: tasks.isRecurring,
        recurringRule: tasks.recurringRule,
        parentId: tasks.parentId,
        estimateMinutes: tasks.estimateMinutes,
        actualMinutes: tasks.actualMinutes,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt
    }).from(tasks).where(and(...conditions)).orderBy(desc(tasks.createdAt));

    // Fetch labels for each task
    const taskIds = tasksResult.map(t => t.id);
    if (taskIds.length === 0) return [];

    const labelsResult = await db.select({
        taskId: taskLabels.taskId,
        labelId: taskLabels.labelId,
        name: labels.name,
        color: labels.color
    })
        .from(taskLabels)
        .leftJoin(labels, eq(taskLabels.labelId, labels.id))
        .where(inArray(taskLabels.taskId, taskIds));

    const tasksWithLabels = tasksResult.map(task => {
        const taskLabelsList = labelsResult.filter(l => l.taskId === task.id).map(l => ({
            id: l.labelId,
            name: l.name || "", // Handle null name from left join
            color: l.color || "#000000" // Handle null color
        }));
        return {
            ...task,
            labels: taskLabelsList
        };
    });

    return tasksWithLabels;
}

export async function getTask(id: number) {
    const result = await db.select({
        id: tasks.id,
        listId: tasks.listId,
        title: tasks.title,
        description: tasks.description,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        isCompleted: tasks.isCompleted,
        completedAt: tasks.completedAt,
        isRecurring: tasks.isRecurring,
        recurringRule: tasks.recurringRule,
        parentId: tasks.parentId,
        estimateMinutes: tasks.estimateMinutes,
        actualMinutes: tasks.actualMinutes,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt
    }).from(tasks).where(eq(tasks.id, id)).limit(1);
    const task = result[0];
    if (!task) return null;

    const labelsResult = await db.select({
        id: labels.id,
        name: labels.name,
        color: labels.color
    })
        .from(taskLabels)
        .leftJoin(labels, eq(taskLabels.labelId, labels.id))
        .where(eq(taskLabels.taskId, id));

    return { ...task, labels: labelsResult };
}

export async function createTask(data: typeof tasks.$inferInsert & { labelIds?: number[] }) {
    const { labelIds, ...taskData } = data;

    const result = await db.insert(tasks).values(taskData).returning();
    const task = Array.isArray(result) ? result[0] : null;

    if (!task) throw new Error("Failed to create task");

    if (labelIds && labelIds.length > 0) {
        await db.insert(taskLabels).values(
            labelIds.map((labelId: number) => ({
                taskId: task.id,
                labelId
            }))
        );
    }

    await db.insert(taskLogs).values({
        taskId: task.id,
        action: "created",
        details: "Task created",
    });

    revalidatePath("/");
    return task;
}

export async function updateTask(id: number, data: Partial<typeof tasks.$inferInsert> & { labelIds?: number[] }) {
    const { labelIds, ...taskData } = data;

    await db.update(tasks).set({ ...taskData, updatedAt: new Date() }).where(eq(tasks.id, id));

    if (labelIds !== undefined) {
        // Replace labels
        await db.delete(taskLabels).where(eq(taskLabels.taskId, id));
        if (labelIds.length > 0) {
            await db.insert(taskLabels).values(
                labelIds.map((labelId: number) => ({
                    taskId: id,
                    labelId
                }))
            );
        }
    }

    await db.insert(taskLogs).values({
        taskId: id,
        action: "updated",
        details: JSON.stringify(data),
    });

    revalidatePath("/");
}

export async function deleteTask(id: number) {
    await db.delete(tasks).where(eq(tasks.id, id));
    revalidatePath("/");
}

export async function toggleTaskCompletion(id: number, isCompleted: boolean) {
    const task = await getTask(id);
    if (!task) return;

    if (isCompleted && task.isRecurring && task.recurringRule) {
        const { RRule } = await import("rrule");
        const rule = RRule.fromString(task.recurringRule);
        const nextDate = rule.after(new Date(), true); // Get next occurrence

        if (nextDate) {
            // Create next task
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, completedAt: _completedAt, isCompleted: _isCompleted, ...taskData } = task;

            // Remove labels from taskData as they are handled separately
            const { labels, ...dataToCopy } = taskData;

            await createTask({
                ...dataToCopy,
                dueDate: nextDate,
                isCompleted: false,
                completedAt: null,
                labelIds: labels.map((l) => l.id).filter((id): id is number => id !== null)
            });
        }
    }

    await updateTask(id, {
        isCompleted,
        completedAt: isCompleted ? new Date() : null
    });
}

export async function getSubtasks(taskId: number) {
    const result = await db.select().from(tasks).where(eq(tasks.parentId, taskId)).orderBy(tasks.createdAt);
    return result;
}

export async function createSubtask(parentId: number, title: string) {
    await db.insert(tasks).values({
        title,
        parentId,
        listId: null, // Subtasks don't necessarily belong to a list directly, or inherit? Schema says listId is optional? Let's check schema.
        // Schema: listId references lists.id. It's not notNull.
        // But wait, if I look at schema: listId: integer("list_id").references(...)
        // It doesn't say notNull(). So it's nullable.
    });
    revalidatePath("/");
}

export async function updateSubtask(id: number, isCompleted: boolean) {
    await db.update(tasks).set({
        isCompleted,
        completedAt: isCompleted ? new Date() : null
    }).where(eq(tasks.id, id));
    revalidatePath("/");
}

export async function deleteSubtask(id: number) {
    await db.delete(tasks).where(eq(tasks.id, id));
    revalidatePath("/");
}

export async function searchTasks(query: string) {
    if (!query || query.trim().length === 0) return [];

    const lowerQuery = `%${query.toLowerCase()}%`;

    const result = await db.select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        listId: tasks.listId,
        isCompleted: tasks.isCompleted
    })
        .from(tasks)
        .where(
            sql`lower(${tasks.title}) LIKE ${lowerQuery} OR lower(${tasks.description}) LIKE ${lowerQuery}`
        )
        .limit(10);

    return result;
}
