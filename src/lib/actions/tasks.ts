/**
 * @module actions/tasks
 * @description Server Actions for task management including CRUD operations,
 * subtasks, search, and completion handling with gamification integration.
 */
"use server";

import {
  db,
  lists,
  tasks,
  labels,
  taskLogs,
  taskLabels,
  reminders,
  taskDependencies,
  userStats,
  eq,
  and,
  desc,
  asc,
  gte,
  lte,
  inArray,
  sql,
  isNull,
  startOfDay,
  endOfDay,
  addDays,
  revalidatePath,
  calculateStreakUpdate,
  suggestMetadata,
  NotFoundError,
  withErrorHandling,
} from "./shared";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/auth";

// Import from other domain modules
import { getLists, getList } from "./lists";
import { getLabels } from "./labels";
import { getUserStats, updateUserProgress } from "./gamification";

/**
 * Retrieves tasks for a user with optional filtering.
 *
 * @param userId - The ID of the user
 * @param listId - Optional list ID to filter by (null for Inbox)
 * @param filter - Optional filter type (today, upcoming, all, completed, next-7-days)
 * @param labelId - Optional label ID to filter by
 * @returns Array of tasks with labels and subtasks
 */
export async function getTasks(
  userId: string,
  listId?: number | null,
  filter?: "today" | "upcoming" | "all" | "completed" | "next-7-days",
  labelId?: number
) {
  await requireUser(userId);

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

    const ids = taskIdsWithLabel.map((t) => t.taskId);
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
    conditions.push(and(gte(tasks.dueDate, todayStart), lte(tasks.dueDate, todayEnd)));
  } else if (filter === "upcoming") {
    conditions.push(gte(tasks.dueDate, todayStart));
  } else if (filter === "next-7-days") {
    const nextWeek = addDays(now, 7);
    conditions.push(and(gte(tasks.dueDate, todayStart), lte(tasks.dueDate, nextWeek)));
  }

  const tasksResult = await db
    .select({
      id: tasks.id,
      listId: tasks.listId,
      title: tasks.title,
      description: tasks.description,
      icon: tasks.icon,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      deadline: tasks.deadline,
      isCompleted: tasks.isCompleted,
      completedAt: tasks.completedAt,
      isRecurring: tasks.isRecurring,
      recurringRule: tasks.recurringRule,
      parentId: tasks.parentId,
      estimateMinutes: tasks.estimateMinutes,
      position: tasks.position,
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
    })
    .from(tasks)
    .leftJoin(lists, eq(tasks.listId, lists.id))
    .where(and(...conditions))
    .orderBy(asc(tasks.isCompleted), asc(tasks.position), desc(tasks.createdAt));

  // Fetch labels for each task
  const taskIds = tasksResult.map((t) => t.id);
  if (taskIds.length === 0) return [];

  /* eslint-disable prefer-const */
  let [labelsResult, subtasksResult] = await Promise.all([
    db
      .select({
        taskId: taskLabels.taskId,
        labelId: taskLabels.labelId,
        name: labels.name,
        color: labels.color,
        icon: labels.icon,
      })
      .from(taskLabels)
      .leftJoin(labels, eq(taskLabels.labelId, labels.id))
      .where(inArray(taskLabels.taskId, taskIds)),

    db
      .select({
        id: tasks.id,
        parentId: tasks.parentId,
        title: tasks.title,
        isCompleted: tasks.isCompleted,
        estimateMinutes: tasks.estimateMinutes,
      })
      .from(tasks)
      .where(inArray(tasks.parentId, taskIds))
      .orderBy(asc(tasks.isCompleted), asc(tasks.createdAt))
  ]);
  /* eslint-enable prefer-const */

  const tasksWithLabelsAndSubtasks = tasksResult.map((task) => {
    const taskLabelsList = labelsResult
      .filter((l) => l.taskId === task.id)
      .map((l) => ({
        id: l.labelId,
        name: l.name || "", // Handle null name from left join
        color: l.color || "#000000", // Handle null color
        icon: l.icon,
      }));

    const taskSubtasks = subtasksResult.filter((s) => s.parentId === task.id);
    const completedSubtaskCount = taskSubtasks.filter((s) => s.isCompleted).length;

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

/**
 * Retrieves a single task by ID with labels, reminders, and blockers.
 *
 * @param id - The task ID
 * @param userId - The ID of the user who owns the task
 * @returns The task with related data, or null if not found
 */
export async function getTask(id: number, userId: string) {
  await requireUser(userId);

  const result = await db
    .select({
      id: tasks.id,
      userId: tasks.userId,
      listId: tasks.listId,
      title: tasks.title,
      description: tasks.description,
      icon: tasks.icon,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      deadline: tasks.deadline,
      isCompleted: tasks.isCompleted,
      completedAt: tasks.completedAt,
      isRecurring: tasks.isRecurring,
      recurringRule: tasks.recurringRule,
      parentId: tasks.parentId,
      estimateMinutes: tasks.estimateMinutes,
      position: tasks.position,
      actualMinutes: tasks.actualMinutes,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .limit(1);
  const task = result[0];
  if (!task) return null;

  const [labelsResult, remindersResult, blockersResult] = await Promise.all([
    db
      .select({
        id: labels.id,
        name: labels.name,
        color: labels.color,
        icon: labels.icon,
      })
      .from(taskLabels)
      .leftJoin(labels, eq(taskLabels.labelId, labels.id))
      .where(eq(taskLabels.taskId, id)),

    db.select().from(reminders).where(eq(reminders.taskId, id)),

    db
      .select({
        id: tasks.id,
        title: tasks.title,
        isCompleted: tasks.isCompleted,
      })
      .from(taskDependencies)
      .innerJoin(tasks, eq(taskDependencies.blockerId, tasks.id))
      .where(eq(taskDependencies.taskId, id)),
  ]);

  return { ...task, labels: labelsResult, reminders: remindersResult, blockers: blockersResult };
}

/**
 * Creates a new task with optional labels and smart tagging.
 *
 * @param data - Task data including optional labelIds
 * @returns The created task
 */
export async function createTask(data: typeof tasks.$inferInsert & { labelIds?: number[] }) {
  await requireUser(data.userId);

  // Rate limit: 100 tasks per hour
  const limit = await rateLimit(`task:create:${data.userId}`, 100, 3600);
  if (!limit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

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
        labelId,
      }))
    );
  }

  await db.insert(taskLogs).values({
    userId: taskData.userId,
    taskId: task.id,
    action: "created",
    details: "Task created",
  });

  revalidatePath("/", "layout");
  return task;
}


/**
 * Updates an existing task with change logging.
 *
 * @param id - The task ID to update
 * @param userId - The ID of the user who owns the task
 * @param data - Partial task data to update including optional labelIds
 */
export async function updateTask(
  id: number,
  userId: string,
  data: Partial<Omit<typeof tasks.$inferInsert, "userId">> & { labelIds?: number[] }
) {
  await requireUser(userId);

  const { labelIds, ...taskData } = data;

  const currentTask = await getTask(id, userId);
  if (!currentTask) return;

  await db
    .update(tasks)
    .set({ ...taskData, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

  if (labelIds !== undefined) {
    // Replace labels
    await db.delete(taskLabels).where(eq(taskLabels.taskId, id));
    if (labelIds.length > 0) {
      await db.insert(taskLabels).values(
        labelIds.map((labelId: number) => ({
          taskId: id,
          labelId,
        }))
      );
    }
  }

  const changes: string[] = [];
  if (taskData.title && taskData.title !== currentTask.title) {
    changes.push(`Title changed from "${currentTask.title}" to "${taskData.title}"`);
  }
  if (taskData.description !== undefined && taskData.description !== currentTask.description) {
    changes.push(
      `Description changed from "${currentTask.description || "(empty)"}" to "${taskData.description || "(empty)"}"`
    );
  }

  if (taskData.icon !== undefined && taskData.icon !== currentTask.icon) {
    changes.push(`Icon changed from "${currentTask.icon || "none"}" to "${taskData.icon || "none"}"`);
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
    const currentLabelIds = currentTask.labels.map((l) => l.id).sort();
    const newLabelIds = [...labelIds].sort();

    if (JSON.stringify(currentLabelIds) !== JSON.stringify(newLabelIds)) {
      const allLabels = await getLabels(userId);
      const currentLabelNames = currentTask.labels.map((l) => l.name || "Unknown");
      const newLabelNames = newLabelIds.map(
        (id) => allLabels.find((l) => l.id === id)?.name || "Unknown"
      );

      const added = newLabelNames.filter((n) => !currentLabelNames.includes(n));
      const removed = currentLabelNames.filter((n) => !newLabelNames.includes(n));

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

  revalidatePath("/", "layout");
}

/**
 * Deletes a task.
 *
 * @param id - The task ID to delete
 * @param userId - The ID of the user who owns the task
 */
export async function deleteTask(id: number, userId: string) {
  await requireUser(userId);
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  revalidatePath("/", "layout");
}

/**
 * Toggles task completion status with XP rewards and streak updates.
 *
 * @param id - The task ID
 * @param userId - The ID of the user who owns the task
 * @param isCompleted - The new completion status
 * @returns XP result with newXP, newLevel, and leveledUp flag
 */
export async function toggleTaskCompletion(id: number, userId: string, isCompleted: boolean) {
  await requireUser(userId);

  const task = await getTask(id, userId);
  if (!task) {
    throw new NotFoundError("Task not found or access denied");
  }

  if (isCompleted && task.isRecurring && task.recurringRule) {
    const { RRule } = await import("rrule");
    const rule = RRule.fromString(task.recurringRule);
    const nextDate = rule.after(new Date(), true); // Get next occurrence

    if (nextDate) {
      // Create next task - copy task data excluding system fields and relations
      const { labels } = task;

      await createTask({
        userId: task.userId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        deadline: task.deadline,
        isRecurring: task.isRecurring,
        recurringRule: task.recurringRule,
        parentId: task.parentId,
        estimateMinutes: task.estimateMinutes,
        actualMinutes: task.actualMinutes,
        dueDate: nextDate,
        isCompleted: false,
        completedAt: null,
        labelIds: labels.map((l) => l.id).filter((id): id is number => id !== null),
      });
    }
  }

  await updateTask(id, userId, {
    isCompleted,
    completedAt: isCompleted ? new Date() : null,
  });

  await db.insert(taskLogs).values({
    userId,
    taskId: id,
    action: isCompleted ? "completed" : "uncompleted",
    details: isCompleted ? "Task marked as completed" : "Task marked as uncompleted",
  });

  if (isCompleted) {
    // Check if this task blocks others
    const blockedTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
      })
      .from(taskDependencies)
      .innerJoin(tasks, eq(taskDependencies.taskId, tasks.id))
      .where(eq(taskDependencies.blockerId, id));

    if (blockedTasks.length > 0) {
      const blockedTaskIds = blockedTasks.map((t) => t.id);

      // Find which of these tasks are still blocked by OTHER incomplete tasks
      // We leverage the fact that "isCompleted" for the current task was just set to true,
      // so it won't be counted in this query looking for 'false'
      const stillBlockedResult = await db
        .select({ taskId: taskDependencies.taskId })
        .from(taskDependencies)
        .innerJoin(tasks, eq(taskDependencies.blockerId, tasks.id))
        .where(
          and(
            inArray(taskDependencies.taskId, blockedTaskIds),
            eq(tasks.isCompleted, false)
          )
        )
        .groupBy(taskDependencies.taskId);

      const stillBlockedTaskIds = new Set(stillBlockedResult.map((t) => t.taskId));

      const logsToInsert = blockedTasks.map((blockedTask) => {
        const isNowUnblocked = !stillBlockedTaskIds.has(blockedTask.id);
        return {
          userId,
          taskId: blockedTask.id,
          action: "blocker_completed",
          details: `Blocker "${task.title}" completed.${isNowUnblocked ? " Task is now unblocked!" : ""
            }`,
        };
      });

      if (logsToInsert.length > 0) {
        await db.insert(taskLogs).values(logsToInsert);
      }
    }
  }

  // Consolidated Gamification Update (Streak + XP in one go)
  const baseXP = 10;
  let bonusXP = 0;
  if (task.priority === "medium") bonusXP += 5;
  if (task.priority === "high") bonusXP += 10;

  const progressResult = await updateUserProgress(userId, baseXP + bonusXP);

  return {
    newXP: progressResult.newXP,
    newLevel: progressResult.newLevel,
    leveledUp: progressResult.leveledUp
  };
}

/**
 * Updates the user's streak based on activity.
 *
 * @param userId - The ID of the user
 */
export async function updateStreak(userId: string) {
  await requireUser(userId);

  const stats = await getUserStats(userId);
  const { newStreak, shouldUpdate, usedFreeze } = calculateStreakUpdate(
    stats.currentStreak,
    stats.lastLogin,
    stats.streakFreezes
  );

  if (shouldUpdate) {
    await db
      .update(userStats)
      .set({
        currentStreak: newStreak,
        longestStreak: Math.max(stats.longestStreak, newStreak),
        streakFreezes: usedFreeze ? stats.streakFreezes - 1 : stats.streakFreezes,
        lastLogin: new Date(),
      })
      .where(eq(userStats.userId, userId));

    if (usedFreeze) {
      await db.insert(taskLogs).values({
        userId,
        taskId: null,
        action: "streak_frozen",
        details: "Streak freeze used! ❄️ Your streak is safe.",
      });
    } else if (newStreak > stats.currentStreak) {
      await db.insert(taskLogs).values({
        userId,
        taskId: null,
        action: "streak_updated",
        details: `Streak increased to ${newStreak} days! 🔥`,
      });
    }
  }
}

/**
 * Retrieves subtasks for a parent task.
 *
 * @param taskId - The parent task ID
 * @param userId - The ID of the user who owns the task
 * @returns Array of subtasks
 */
export async function getSubtasks(taskId: number, userId: string) {
  await requireUser(userId);

  const result = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.parentId, taskId), eq(tasks.userId, userId)))
    .orderBy(tasks.createdAt);
  return result;
}

/**
 * Creates a subtask for a parent task.
 *
 * @param parentId - The parent task ID
 * @param userId - The ID of the user
 * @param title - The subtask title
 * @param estimateMinutes - Optional time estimate in minutes
 * @returns The created subtask
 */
export async function createSubtask(
  parentId: number,
  userId: string,
  title: string,
  estimateMinutes?: number
) {
  await requireUser(userId);

  const result = await db
    .insert(tasks)
    .values({
      userId,
      title,
      parentId,
      listId: null,
      estimateMinutes: estimateMinutes || null,
    })
    .returning();

  const subtask = result[0];

  await db.insert(taskLogs).values({
    userId,
    taskId: parentId,
    action: "subtask_created",
    details: `Subtask created: ${title}`,
  });

  revalidatePath("/", "layout");
  return subtask;
}

/**
 * Updates a subtask's completion status.
 *
 * @param id - The subtask ID
 * @param userId - The ID of the user who owns the subtask
 * @param isCompleted - The new completion status
 */
export async function updateSubtask(id: number, userId: string, isCompleted: boolean) {
  await requireUser(userId);

  await db
    .update(tasks)
    .set({
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
    })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  revalidatePath("/", "layout");
}

/**
 * Deletes a subtask.
 *
 * @param id - The subtask ID
 * @param userId - The ID of the user who owns the subtask
 */
export async function deleteSubtask(id: number, userId: string) {
  await requireUser(userId);
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  revalidatePath("/", "layout");
}

/**
 * Searches tasks by title or description.
 *
 * @param userId - The ID of the user
 * @param query - The search query
 * @returns Array of matching tasks (limited to 10)
 */
export async function searchTasks(userId: string, query: string) {
  await requireUser(userId);

  if (!query || query.trim().length === 0) return [];

  // Rate limit: 500 searches per hour
  const limit = await rateLimit(`task:search:${userId}`, 500, 3600);
  if (!limit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  const lowerQuery = `%${query.toLowerCase()}%`;

  const result = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      listId: tasks.listId,
      isCompleted: tasks.isCompleted,
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

/**
 * Retrieves all tasks for client-side search indexing.
 *
 * @param userId - The ID of the user
 * @returns Array of tasks optimized for search (id, title, description, status)
 */
export async function getTasksForSearch(userId: string) {
  await requireUser(userId);

  // Rate limit: 200 index fetches per hour
  const limit = await rateLimit(`task:index:${userId}`, 200, 3600);
  if (!limit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  const result = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      isCompleted: tasks.isCompleted,
      listId: tasks.listId,
    })
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .orderBy(desc(tasks.createdAt))
    .limit(2000); // Reasonable limit for client-side index

  return result;
}

/**
 * Internal implementation for reordering tasks.
 *
 * @param userId - The ID of the user who owns the tasks
 * @param items - Array of task IDs and their new positions
 */
async function reorderTasksImpl(userId: string, items: { id: number; position: number }[]) {
  await requireUser(userId);

  await Promise.all(
    items.map((item) =>
      db
        .update(tasks)
        .set({ position: item.position })
        .where(and(eq(tasks.id, item.id), eq(tasks.userId, userId)))
    )
  );

  if (items.length > 0) {
    await db.insert(taskLogs).values({
      userId,
      taskId: null,
      action: "reorder",
      details: `Reordered ${items.length} tasks`,
    });
  }

  revalidatePath("/");
}

/**
 * Reorders tasks.
 *
 * @param userId - The ID of the user who owns the tasks
 * @param items - Array of task IDs and their new positions
 * @returns ActionResult with void on success or error
 */
export const reorderTasks = withErrorHandling(reorderTasksImpl);
