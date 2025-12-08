"use server";

import { db, lists, tasks, labels, taskLogs, taskLabels, reminders, taskDependencies, templates, userStats, achievements, userAchievements, viewSettings } from "@/db";
import { eq, and, desc, gte, lte, inArray, sql, isNull, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { startOfDay, endOfDay, addDays } from "date-fns";
import { calculateLevel, calculateStreakUpdate } from "./gamification";
import { suggestMetadata } from "./smart-tags";

// --- Lists ---

export async function getLists(userId: string) {
    return await db.select().from(lists).where(eq(lists.userId, userId)).orderBy(lists.createdAt);
}

export async function getList(id: number, userId: string) {
    const result = await db.select().from(lists).where(and(eq(lists.id, id), eq(lists.userId, userId)));
    return result[0];
}

export async function createList(data: typeof lists.$inferInsert) {
    const result = await db.insert(lists).values(data).returning();
    revalidatePath("/");
    return result[0];
}

export async function updateList(id: number, userId: string, data: Partial<Omit<typeof lists.$inferInsert, 'userId'>>) {
    await db.update(lists).set(data).where(and(eq(lists.id, id), eq(lists.userId, userId)));
    revalidatePath("/");
}

export async function deleteList(id: number, userId: string) {
    await db.delete(lists).where(and(eq(lists.id, id), eq(lists.userId, userId)));
    revalidatePath("/");
}

// --- Labels ---

export async function getLabels(userId: string) {
    return await db.select().from(labels).where(eq(labels.userId, userId));
}

export async function getLabel(id: number, userId: string) {
    const result = await db.select().from(labels).where(and(eq(labels.id, id), eq(labels.userId, userId)));
    return result[0];
}

export async function createLabel(data: typeof labels.$inferInsert) {
    const result = await db.insert(labels).values(data).returning();
    revalidatePath("/");
    return result[0];
}

export async function updateLabel(id: number, userId: string, data: Partial<Omit<typeof labels.$inferInsert, 'userId'>>) {
    await db.update(labels).set(data).where(and(eq(labels.id, id), eq(labels.userId, userId)));
    revalidatePath("/");
}

export async function deleteLabel(id: number, userId: string) {
    await db.delete(labels).where(and(eq(labels.id, id), eq(labels.userId, userId)));
    revalidatePath("/");
}

// --- Tasks ---

export async function getTasks(userId: string, listId?: number | null, filter?: "today" | "upcoming" | "all" | "completed" | "next-7-days", labelId?: number) {
    const conditions = [];

    // Always filter by user
    conditions.push(eq(tasks.userId, userId));

    // Always filter out subtasks - only show parent tasks
    conditions.push(isNull(tasks.parentId));

    if (listId) {
        conditions.push(eq(tasks.listId, listId));
    } else if (listId === null) {
        conditions.push(isNull(tasks.listId));
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
        deadline: tasks.deadline,
        isCompleted: tasks.isCompleted,
        completedAt: tasks.completedAt,
        isRecurring: tasks.isRecurring,
        recurringRule: tasks.recurringRule,
        parentId: tasks.parentId,
        estimateMinutes: tasks.estimateMinutes,
        actualMinutes: tasks.actualMinutes,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        energyLevel: tasks.energyLevel,
        context: tasks.context,
        isHabit: tasks.isHabit,
        blockedByCount: sql<number>`(SELECT COUNT(*) FROM ${taskDependencies} WHERE ${taskDependencies.taskId} = ${tasks.id})`,
        listName: lists.name,
        listColor: lists.color,
        listIcon: lists.icon,
    }).from(tasks)
        .leftJoin(lists, eq(tasks.listId, lists.id))
        .where(and(...conditions))
        .orderBy(asc(tasks.isCompleted), desc(tasks.createdAt));

    // Fetch labels for each task
    const taskIds = tasksResult.map(t => t.id);
    if (taskIds.length === 0) return [];

    const labelsResult = await db.select({
        taskId: taskLabels.taskId,
        labelId: taskLabels.labelId,
        name: labels.name,
        color: labels.color,
        icon: labels.icon
    })
        .from(taskLabels)
        .leftJoin(labels, eq(taskLabels.labelId, labels.id))
        .where(inArray(taskLabels.taskId, taskIds));

    // Fetch subtasks for all parent tasks
    const subtasksResult = await db.select({
        id: tasks.id,
        parentId: tasks.parentId,
        title: tasks.title,
        isCompleted: tasks.isCompleted,
        estimateMinutes: tasks.estimateMinutes,
    }).from(tasks)
        .where(inArray(tasks.parentId, taskIds))
        .orderBy(asc(tasks.isCompleted), asc(tasks.createdAt));

    const tasksWithLabelsAndSubtasks = tasksResult.map(task => {
        const taskLabelsList = labelsResult.filter(l => l.taskId === task.id).map(l => ({
            id: l.labelId,
            name: l.name || "", // Handle null name from left join
            color: l.color || "#000000", // Handle null color
            icon: l.icon
        }));

        const taskSubtasks = subtasksResult.filter(s => s.parentId === task.id);
        const completedSubtaskCount = taskSubtasks.filter(s => s.isCompleted).length;

        return {
            ...task,
            labels: taskLabelsList,
            subtasks: taskSubtasks,
            subtaskCount: taskSubtasks.length,
            completedSubtaskCount,
        };
    });

    return tasksWithLabelsAndSubtasks;
}

export async function getTask(id: number, userId: string) {
    const result = await db.select({
        id: tasks.id,
        userId: tasks.userId,
        listId: tasks.listId,
        title: tasks.title,
        description: tasks.description,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        deadline: tasks.deadline,
        isCompleted: tasks.isCompleted,
        completedAt: tasks.completedAt,
        isRecurring: tasks.isRecurring,
        recurringRule: tasks.recurringRule,
        parentId: tasks.parentId,
        estimateMinutes: tasks.estimateMinutes,
        actualMinutes: tasks.actualMinutes,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt
    }).from(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId))).limit(1);
    const task = result[0];
    if (!task) return null;

    const labelsResult = await db.select({
        id: labels.id,
        name: labels.name,
        color: labels.color,
        icon: labels.icon
    })
        .from(taskLabels)
        .leftJoin(labels, eq(taskLabels.labelId, labels.id))
        .where(eq(taskLabels.taskId, id));

    const remindersResult = await db.select().from(reminders).where(eq(reminders.taskId, id));

    const blockersResult = await db.select({
        id: tasks.id,
        title: tasks.title,
        isCompleted: tasks.isCompleted,
    })
        .from(taskDependencies)
        .innerJoin(tasks, eq(taskDependencies.blockerId, tasks.id))
        .where(eq(taskDependencies.taskId, id));

    return { ...task, labels: labelsResult, reminders: remindersResult, blockers: blockersResult };
}

export async function createTask(data: typeof tasks.$inferInsert & { labelIds?: number[] }) {
    const { labelIds, ...taskData } = data;
    let finalLabelIds = labelIds || [];

    // Smart Tagging: If no list or labels provided, try to guess them
    if (!taskData.listId && finalLabelIds.length === 0 && taskData.title && taskData.userId) {
        const allLists = await getLists(taskData.userId);
        const allLabels = await getLabels(taskData.userId);
        const suggestions = await suggestMetadata(taskData.title, allLists, allLabels);

        if (suggestions.listId) taskData.listId = suggestions.listId;
        if (suggestions.labelIds.length > 0) finalLabelIds = suggestions.labelIds;
    }

    const result = await db.insert(tasks).values(taskData).returning();
    const task = Array.isArray(result) ? result[0] : null;

    if (!task) throw new Error("Failed to create task");

    if (finalLabelIds.length > 0) {
        await db.insert(taskLabels).values(
            finalLabelIds.map((labelId: number) => ({
                taskId: task.id,
                labelId
            }))
        );
    }

    await db.insert(taskLogs).values({
        userId: taskData.userId,
        taskId: task.id,
        action: "created",
        details: "Task created",
    });

    revalidatePath("/");
    return task;
}

export async function updateTask(id: number, userId: string, data: Partial<Omit<typeof tasks.$inferInsert, 'userId'>> & { labelIds?: number[] }) {
    const { labelIds, ...taskData } = data;

    const currentTask = await getTask(id, userId);
    if (!currentTask) return;

    await db.update(tasks).set({ ...taskData, updatedAt: new Date() }).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

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

    const changes: string[] = [];
    if (taskData.title && taskData.title !== currentTask.title) {
        changes.push(`Title changed from "${currentTask.title}" to "${taskData.title}"`);
    }
    if (taskData.description !== undefined && taskData.description !== currentTask.description) {
        changes.push(`Description changed from "${currentTask.description || '(empty)'}" to "${taskData.description || '(empty)'}"`);
    }
    if (taskData.priority && taskData.priority !== currentTask.priority) {
        changes.push(`Priority changed from ${currentTask.priority} to ${taskData.priority}`);
    }

    if (taskData.dueDate !== undefined) {
        const currentDueDate = currentTask.dueDate ? currentTask.dueDate.getTime() : null;
        const newDueDate = taskData.dueDate ? taskData.dueDate.getTime() : null;
        if (currentDueDate !== newDueDate) {
            const fromDate = currentTask.dueDate ? currentTask.dueDate.toLocaleDateString() : "(none)";
            const toDate = taskData.dueDate ? taskData.dueDate.toLocaleDateString() : "(none)";
            changes.push(`Due date changed from ${fromDate} to ${toDate}`);
        }
    }

    if (taskData.deadline !== undefined) {
        const currentDeadline = currentTask.deadline ? currentTask.deadline.getTime() : null;
        const newDeadline = taskData.deadline ? taskData.deadline.getTime() : null;
        if (currentDeadline !== newDeadline) {
            const fromDate = currentTask.deadline ? currentTask.deadline.toLocaleDateString() : "(none)";
            const toDate = taskData.deadline ? taskData.deadline.toLocaleDateString() : "(none)";
            changes.push(`Deadline changed from ${fromDate} to ${toDate}`);
        }
    }

    if (taskData.isRecurring !== undefined && taskData.isRecurring !== currentTask.isRecurring) {
        changes.push(taskData.isRecurring ? "Task set to recurring" : "Task no longer recurring");
    }

    if (taskData.listId !== undefined && taskData.listId !== currentTask.listId) {
        let fromListName = "Inbox";
        if (currentTask.listId) {
            const list = await getList(currentTask.listId, userId);
            if (list) fromListName = list.name;
        }

        let toListName = "Inbox";
        if (taskData.listId) {
            const list = await getList(taskData.listId, userId);
            if (list) toListName = list.name;
        }

        changes.push(`List changed from "${fromListName}" to "${toListName}"`);
    }

    if (labelIds !== undefined) {
        const currentLabelIds = currentTask.labels.map(l => l.id).sort();
        const newLabelIds = [...labelIds].sort();

        if (JSON.stringify(currentLabelIds) !== JSON.stringify(newLabelIds)) {
            const allLabels = await getLabels(userId);
            const currentLabelNames = currentTask.labels.map(l => l.name || "Unknown");
            const newLabelNames = newLabelIds.map(id => allLabels.find(l => l.id === id)?.name || "Unknown");

            const added = newLabelNames.filter(n => !currentLabelNames.includes(n));
            const removed = currentLabelNames.filter(n => !newLabelNames.includes(n));

            if (added.length > 0) changes.push(`Added labels: ${added.join(", ")}`);
            if (removed.length > 0) changes.push(`Removed labels: ${removed.join(", ")}`);
        }
    }

    if (changes.length > 0) {
        await db.insert(taskLogs).values({
            userId,
            taskId: id,
            action: "updated",
            details: changes.join("\n"),
        });
    }

    revalidatePath("/");
}

export async function deleteTask(id: number, userId: string) {
    // Log before deleting (though cascading delete might remove the log if not careful, but taskLogs has cascade delete on task_id)
    // Actually, if we delete the task, the logs might be deleted too if we have ON DELETE CASCADE.
    // Let's check schema. Yes, taskLogs references tasks.id with onDelete: "cascade".
    // So we can't keep logs for deleted tasks unless we make taskId nullable or remove the FK constraint.
    // For now, we accept that logs are deleted with the task.
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    revalidatePath("/");
}

export async function toggleTaskCompletion(id: number, userId: string, isCompleted: boolean) {
    const task = await getTask(id, userId);
    if (!task) return;

    if (isCompleted && task.isRecurring && task.recurringRule) {
        const { RRule } = await import("rrule");
        const rule = RRule.fromString(task.recurringRule);
        const nextDate = rule.after(new Date(), true); // Get next occurrence

        if (nextDate) {
            // Create next task
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, completedAt: _completedAt, isCompleted: _isCompleted, ...taskData } = task;

            // Remove labels and reminders from taskData as they are handled separately
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { labels, reminders, ...dataToCopy } = taskData;

            await createTask({
                ...dataToCopy,
                dueDate: nextDate,
                isCompleted: false,
                completedAt: null,
                labelIds: labels.map((l) => l.id).filter((id): id is number => id !== null)
            });
        }
    }

    await updateTask(id, userId, {
        isCompleted,
        completedAt: isCompleted ? new Date() : null
    });

    await db.insert(taskLogs).values({
        userId,
        taskId: id,
        action: isCompleted ? "completed" : "uncompleted",
        details: isCompleted ? "Task marked as completed" : "Task marked as uncompleted",
    });

    if (isCompleted) {
        // Check if this task blocks others
        const blockedTasks = await db.select({
            id: tasks.id,
            title: tasks.title
        })
            .from(taskDependencies)
            .innerJoin(tasks, eq(taskDependencies.taskId, tasks.id))
            .where(eq(taskDependencies.blockerId, id));

        for (const blockedTask of blockedTasks) {
            // Check if this was the last blocker
            const remainingBlockers = await db.select({ count: sql<number>`count(*)` })
                .from(taskDependencies)
                .leftJoin(tasks, eq(taskDependencies.blockerId, tasks.id))
                .where(and(
                    eq(taskDependencies.taskId, blockedTask.id),
                    eq(tasks.isCompleted, false) // Only count uncompleted blockers
                ));

            const isNowUnblocked = remainingBlockers[0].count === 0;

            await db.insert(taskLogs).values({
                userId,
                taskId: blockedTask.id,
                action: "blocker_completed",
                details: `Blocker "${task.title}" completed.${isNowUnblocked ? " Task is now unblocked!" : ""}`,
            });
        }
    }

    // Update Streak
    await updateStreak(userId);

    // Award XP
    const baseXP = 10;
    let bonusXP = 0;
    if (task.priority === "medium") bonusXP += 5;
    if (task.priority === "high") bonusXP += 10;

    return await addXP(userId, baseXP + bonusXP);
}

export async function updateStreak(userId: string) {
    const stats = await getUserStats(userId);
    const { newStreak, shouldUpdate } = calculateStreakUpdate(stats.currentStreak, stats.lastLogin);

    if (shouldUpdate) {
        await db.update(userStats)
            .set({
                currentStreak: newStreak,
                longestStreak: Math.max(stats.longestStreak, newStreak),
                lastLogin: new Date() // Using lastLogin as "last activity" for simplicity
            })
            .where(eq(userStats.userId, userId));

        if (newStreak > stats.currentStreak) {
            await db.insert(taskLogs).values({
                userId,
                taskId: null,
                action: "streak_updated",
                details: `Streak increased to ${newStreak} days! 🔥`,
            });
        }
    }
}

export async function getSubtasks(taskId: number, userId: string) {
    const result = await db.select().from(tasks).where(and(eq(tasks.parentId, taskId), eq(tasks.userId, userId))).orderBy(tasks.createdAt);
    return result;
}

export async function createSubtask(parentId: number, userId: string, title: string, estimateMinutes?: number) {
    const result = await db.insert(tasks).values({
        userId,
        title,
        parentId,
        listId: null,
        estimateMinutes: estimateMinutes || null,
    }).returning();

    const subtask = result[0];

    await db.insert(taskLogs).values({
        userId,
        taskId: parentId,
        action: "subtask_created",
        details: `Subtask created: ${title}`,
    });

    revalidatePath("/");
    return subtask;
}

export async function updateSubtask(id: number, userId: string, isCompleted: boolean) {
    await db.update(tasks).set({
        isCompleted,
        completedAt: isCompleted ? new Date() : null
    }).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    revalidatePath("/");
}

export async function deleteSubtask(id: number, userId: string) {
    await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    revalidatePath("/");
}

export async function searchTasks(userId: string, query: string) {
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
            and(
                eq(tasks.userId, userId),
                sql`(lower(${tasks.title}) LIKE ${lowerQuery} OR lower(${tasks.description}) LIKE ${lowerQuery})`
            )
        )
        .limit(10);

    return result;
}

// --- Reminders ---

export async function getReminders(taskId: number) {
    return await db.select().from(reminders).where(eq(reminders.taskId, taskId));
}

export async function createReminder(userId: string, taskId: number, remindAt: Date) {
    await db.insert(reminders).values({
        taskId,
        remindAt,
    });

    await db.insert(taskLogs).values({
        userId,
        taskId,
        action: "reminder_added",
        details: `Reminder set for ${remindAt.toLocaleString()}`,
    });

    revalidatePath("/");
}

export async function deleteReminder(userId: string, id: number) {
    // Get reminder to log it before deleting
    const reminder = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1);
    if (reminder.length > 0) {
        await db.insert(taskLogs).values({
            userId,
            taskId: reminder[0].taskId,
            action: "reminder_removed",
            details: `Reminder removed for ${reminder[0].remindAt.toLocaleString()}`,
        });
    }

    await db.delete(reminders).where(eq(reminders.id, id));
    revalidatePath("/");
}

// --- Logs ---

export async function getTaskLogs(taskId: number) {
    return await db.select().from(taskLogs).where(eq(taskLogs.taskId, taskId)).orderBy(desc(taskLogs.createdAt), desc(taskLogs.id));
}

export async function getActivityLog(userId: string) {
    return await db.select({
        id: taskLogs.id,
        taskId: taskLogs.taskId,
        taskTitle: sql<string>`COALESCE(${tasks.title}, 'Unknown Task')`.as('task_title'),
        action: taskLogs.action,
        details: taskLogs.details,
        createdAt: taskLogs.createdAt
    })
        .from(taskLogs)
        .leftJoin(tasks, eq(taskLogs.taskId, tasks.id))
        .where(eq(taskLogs.userId, userId))
        .orderBy(desc(taskLogs.createdAt))
        .limit(50);
}

// --- Dependencies ---

export async function addDependency(userId: string, taskId: number, blockerId: number) {
    if (taskId === blockerId) throw new Error("Task cannot block itself");

    // Check for circular dependency (simple check: is blocker blocked by task?)
    const reverse = await db.select().from(taskDependencies)
        .where(and(eq(taskDependencies.taskId, blockerId), eq(taskDependencies.blockerId, taskId)));

    if (reverse.length > 0) throw new Error("Circular dependency detected");

    await db.insert(taskDependencies).values({
        taskId,
        blockerId,
    });

    await db.insert(taskLogs).values({
        userId,
        taskId,
        action: "dependency_added",
        details: `Blocked by task #${blockerId}`,
    });

    revalidatePath("/");
}

export async function removeDependency(userId: string, taskId: number, blockerId: number) {
    await db.delete(taskDependencies)
        .where(and(eq(taskDependencies.taskId, taskId), eq(taskDependencies.blockerId, blockerId)));

    await db.insert(taskLogs).values({
        userId,
        taskId,
        action: "dependency_removed",
        details: `No longer blocked by task #${blockerId}`,
    });

    revalidatePath("/");
}

export async function getBlockers(taskId: number) {
    const result = await db.select({
        id: tasks.id,
        title: tasks.title,
        isCompleted: tasks.isCompleted,
    })
        .from(taskDependencies)
        .innerJoin(tasks, eq(taskDependencies.blockerId, tasks.id))
        .where(eq(taskDependencies.taskId, taskId));

    return result;
}

export async function getBlockedTasks(blockerId: number) {
    const result = await db.select({
        id: tasks.id,
        title: tasks.title,
        isCompleted: tasks.isCompleted,
    })
        .from(taskDependencies)
        .innerJoin(tasks, eq(taskDependencies.taskId, tasks.id))
        .where(eq(taskDependencies.blockerId, blockerId));

    return result;
}

// --- Templates ---

export async function getTemplates(userId: string) {
    return await db.select().from(templates).where(eq(templates.userId, userId)).orderBy(desc(templates.createdAt));
}

export async function createTemplate(userId: string, name: string, content: string) {
    await db.insert(templates).values({
        userId,
        name,
        content,
    });
    revalidatePath("/");
}

export async function deleteTemplate(id: number, userId: string) {
    await db.delete(templates).where(and(eq(templates.id, id), eq(templates.userId, userId)));
    revalidatePath("/");
}

export async function instantiateTemplate(userId: string, templateId: number, listId: number | null = null) {
    const template = await db.select().from(templates).where(and(eq(templates.id, templateId), eq(templates.userId, userId))).limit(1);
    if (template.length === 0) throw new Error("Template not found");

    const data = JSON.parse(template[0].content);

    // Helper to replace variables in strings
    function replaceVariables(str: string): string {
        if (typeof str !== 'string') return str;
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const tomorrow = addDays(now, 1).toISOString().split('T')[0];
        const nextWeek = addDays(now, 7).toISOString().split('T')[0];

        return str
            .replace(/{date}/g, today)
            .replace(/{tomorrow}/g, tomorrow)
            .replace(/{next_week}/g, nextWeek);
    }

    // Helper to recursively create tasks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async function createRecursive(taskData: any, parentId: number | null = null) {
        const { subtasks, ...rest } = taskData;

        // Process string fields for variables
        const processedData = { ...rest };
        if (processedData.title) processedData.title = replaceVariables(processedData.title);
        if (processedData.description) processedData.description = replaceVariables(processedData.description);

        // Clean up data for insertion
        const insertData = {
            ...processedData,
            userId,
            listId: parentId ? null : (listId || processedData.listId), // Only top-level tasks get the listId override
            parentId,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        // Remove fields that shouldn't be directly inserted if they exist in JSON but not schema or handled differently
        delete insertData.id;
        delete insertData.subtasks;
        delete insertData.isCompleted;
        delete insertData.completedAt;

        // Handle dates if they are strings after substitution (though createTask expects Date objects usually, but Drizzle handles strings for SQLite sometimes or we need to parse)
        // Actually, if the user puts "{date}" in dueDate, it becomes a string "YYYY-MM-DD".
        // We should check if dueDate is a string and try to parse it.
        if (typeof insertData.dueDate === 'string') {
            insertData.dueDate = new Date(insertData.dueDate);
        }
        if (typeof insertData.deadline === 'string') {
            insertData.deadline = new Date(insertData.deadline);
        }

        const newTask = await createTask(insertData);

        if (subtasks && Array.isArray(subtasks)) {
            for (const sub of subtasks) {
                await createRecursive(sub, newTask.id);
            }
        }
        return newTask;
    }

    await createRecursive(data);
    revalidatePath("/");
}

// --- Gamification ---

export async function getUserStats(userId: string) {
    const stats = await db.select().from(userStats).where(eq(userStats.userId, userId));
    if (stats.length === 0) {
        // Initialize if not exists
        const newStats = await db.insert(userStats).values({ userId }).returning();
        return newStats[0];
    }
    return stats[0];
}

export async function addXP(userId: string, amount: number) {
    const stats = await getUserStats(userId);
    const newXP = stats.xp + amount;
    const newLevel = calculateLevel(newXP);

    await db.update(userStats)
        .set({
            xp: newXP,
            level: newLevel,
        })
        .where(eq(userStats.userId, userId));

    // Check for achievements
    await checkAchievements(userId, stats.xp + amount, stats.currentStreak);

    revalidatePath("/");
    return { newXP, newLevel, leveledUp: newLevel > stats.level };
}

export async function checkAchievements(userId: string, currentXP: number, currentStreak: number) {
    // Get all achievements
    const allAchievements = await db.select().from(achievements);

    // Get unlocked achievements for this user
    const unlocked = await db.select().from(userAchievements).where(eq(userAchievements.userId, userId));
    const unlockedIds = new Set(unlocked.map(u => u.achievementId));

    // Get total tasks completed by this user
    const completedTasks = await db.select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(and(eq(tasks.userId, userId), eq(tasks.isCompleted, true)));
    const totalCompleted = completedTasks[0].count;

    // Get tasks completed today for "Hat Trick"
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    const completedToday = await db.select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(and(
            eq(tasks.userId, userId),
            eq(tasks.isCompleted, true),
            gte(tasks.completedAt, todayStart),
            lte(tasks.completedAt, todayEnd)
        ));
    const dailyCompleted = completedToday[0].count;

    for (const achievement of allAchievements) {
        if (unlockedIds.has(achievement.id)) continue;

        let isUnlocked = false;

        switch (achievement.conditionType) {
            case "count_total":
                if (totalCompleted >= achievement.conditionValue) isUnlocked = true;
                break;
            case "count_daily":
                if (dailyCompleted >= achievement.conditionValue) isUnlocked = true;
                break;
            case "streak":
                if (currentStreak >= achievement.conditionValue) isUnlocked = true;
                break;
        }

        if (isUnlocked) {
            await db.insert(userAchievements).values({
                userId,
                achievementId: achievement.id
            });

            // Award XP for achievement
            await addXP(userId, achievement.xpReward);

            // Log it
            await db.insert(taskLogs).values({
                userId,
                taskId: null, // System log
                action: "achievement_unlocked",
                details: `Unlocked achievement: ${achievement.name} (+${achievement.xpReward} XP)`,
            });
        }
    }
}

export async function getAchievements() {
    return await db.select().from(achievements);
}

export async function getUserAchievements(userId: string) {
    const result = await db.select({
        achievementId: userAchievements.achievementId,
        unlockedAt: userAchievements.unlockedAt,
        name: achievements.name,
        description: achievements.description,
        icon: achievements.icon,
        xpReward: achievements.xpReward
    })
        .from(userAchievements)
        .leftJoin(achievements, eq(userAchievements.achievementId, achievements.id))
        .where(eq(userAchievements.userId, userId))
        .orderBy(desc(userAchievements.unlockedAt));

    return result;
}

// --- View Settings ---

export async function getViewSettings(userId: string, viewId: string) {
    const result = await db.select().from(viewSettings).where(and(eq(viewSettings.userId, userId), eq(viewSettings.viewId, viewId)));
    return result[0] || null;
}

export async function saveViewSettings(userId: string, viewId: string, settings: {
    layout?: "list" | "board" | "calendar";
    showCompleted?: boolean;
    groupBy?: "none" | "dueDate" | "priority" | "label";
    sortBy?: "manual" | "dueDate" | "priority" | "name";
    sortOrder?: "asc" | "desc";
    filterDate?: "all" | "hasDate" | "noDate";
    filterPriority?: string | null;
    filterLabelId?: number | null;
}) {
    const existing = await getViewSettings(userId, viewId);

    if (existing) {
        await db.update(viewSettings)
            .set({ ...settings, updatedAt: new Date() })
            .where(and(eq(viewSettings.userId, userId), eq(viewSettings.viewId, viewId)));
    } else {
        await db.insert(viewSettings).values({
            userId,
            viewId,
            ...settings,
        });
    }

    revalidatePath("/");
}

export async function resetViewSettings(userId: string, viewId: string) {
    await db.delete(viewSettings).where(and(eq(viewSettings.userId, userId), eq(viewSettings.viewId, viewId)));
    revalidatePath("/");
}
