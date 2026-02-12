"use server";

import {
  db,
  tasks,
  labels,
  taskLogs,
  taskLabels,
  taskDependencies,
  sqliteConnection,
  eq,
  and,
  inArray,
  sql,
  isNull,
  revalidatePath,
  type ActionResult,
  NotFoundError,
  ConflictError,
  withErrorHandling,
} from "../shared";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/auth";
import { transformNullableTimestamp } from "@/lib/migration-utils";
import { getLists, getListInternal } from "../lists";
import { getLabels } from "../labels";
import { updateUserProgress } from "../gamification";
import { createTaskSchema, updateTaskSchema } from "@/lib/validation/tasks";
import { coerceDuePrecision, normalizeDueAnchor } from "@/lib/due-utils";
import { getTaskImpl } from "./queries";
import { isValidId } from "./helpers";
import { suggestMetadata } from "../shared";

async function createTaskImpl(data: typeof tasks.$inferInsert & { labelIds?: number[] }) {
  const user = await requireUser(data.userId);

  try {
    const limit = await rateLimit(`task:create:${data.userId}`, 100, 3600);
    if (!limit.success) {
      throw new Error("Rate limit exceeded. Please try again later.");
    }

    const parsedData = createTaskSchema.parse(data);
    const { labelIds, dueDatePrecision: rawPrecision, ...taskData } = parsedData;
    let finalLabelIds = labelIds || [];

    if (taskData.parentId) {
      if (!isValidId(taskData.parentId)) {
        throw new Error("Invalid parent ID");
      }

      const parentTask = await db
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.id, taskData.parentId), eq(tasks.userId, taskData.userId)))
        .limit(1);

      if (parentTask.length === 0) {
        throw new NotFoundError("Parent task not found or access denied");
      }
    }

    if (taskData.listId) {
      if (!isValidId(taskData.listId)) {
        throw new Error("Invalid list ID");
      }

      const list = await getListInternal(taskData.listId, taskData.userId);
      if (!list) {
        throw new NotFoundError("List not found or access denied");
      }
    }

    if (!taskData.listId && finalLabelIds.length === 0 && taskData.title && taskData.userId) {
      try {
        const [allLists, allLabels] = await Promise.all([
          getLists(taskData.userId),
          getLabels(taskData.userId),
        ]);
        const suggestions = await suggestMetadata(taskData.title, allLists, allLabels);

        if (suggestions.listId) taskData.listId = suggestions.listId;
        if (suggestions.labelIds.length > 0) finalLabelIds = suggestions.labelIds;
      } catch (error) {
        console.warn("Smart tagging failed:", error);
      }
    }

    const conditions = [
      eq(tasks.userId, taskData.userId),
      taskData.parentId
        ? eq(tasks.parentId, taskData.parentId)
        : and(
            isNull(tasks.parentId),
            taskData.listId ? eq(tasks.listId, taskData.listId) : isNull(tasks.listId)
          ),
    ];

    const [minPosResult] = await db
      .select({ min: sql<number>`min(${tasks.position})` })
      .from(tasks)
      .where(and(...conditions));

    const currentMin = minPosResult?.min ?? 0;
    const precision = coerceDuePrecision(taskData.dueDate, rawPrecision);
    const normalizedDueDate = taskData.dueDate
      ? (precision
        ? normalizeDueAnchor(taskData.dueDate, precision, user.weekStartsOnMonday ?? false)
        : taskData.dueDate)
      : null;

    const finalTaskData = {
      ...taskData,
      dueDate: normalizedDueDate,
      dueDatePrecision: precision,
      position: currentMin - 1024
    };

    const result = await db.insert(tasks).values(finalTaskData as typeof tasks.$inferInsert).returning();
    const task = Array.isArray(result) ? result[0] : null;

    if (!task) throw new Error("Failed to create task");
    const isSqlite = !!sqliteConnection;
    const coerceTimestamp = (value: Date | number | null | undefined) => {
      if (value === null || value === undefined) return value;
      if (value instanceof Date) return value;
      return transformNullableTimestamp(value);
    };
    const normalizedTask = (isSqlite
      ? {
          ...task,
          dueDate: coerceTimestamp(task.dueDate),
          deadline: coerceTimestamp(task.deadline),
          completedAt: coerceTimestamp(task.completedAt),
          createdAt: coerceTimestamp(task.createdAt),
          updatedAt: coerceTimestamp(task.updatedAt),
        }
      : task) as typeof tasks.$inferSelect;

    if (finalLabelIds.length > 0) {
      const validLabels = await db
        .select({ id: labels.id })
        .from(labels)
        .where(and(eq(labels.userId, taskData.userId), inArray(labels.id, finalLabelIds)));

      const validLabelIds = validLabels.map((l) => l.id);

      if (validLabelIds.length > 0) {
        await db.insert(taskLabels).values(
          validLabelIds.map((labelId: number) => ({
            taskId: task.id,
            labelId,
          }))
        );
      }
    }

    await db.insert(taskLogs).values({
      userId: taskData.userId,
      taskId: task.id,
      action: "created",
      details: "Task created",
    });

    const { syncTodoistNow } = await import("@/lib/actions/todoist");
    await syncTodoistNow();

    revalidatePath("/", "layout");
    return normalizedTask;
  } catch (error) {
    console.error("Failed to create task:", error);
    throw error;
  }
}

export const createTask: (
  data: typeof tasks.$inferInsert & { labelIds?: number[] }
) => Promise<ActionResult<typeof tasks.$inferSelect>> = withErrorHandling(createTaskImpl);

async function updateTaskImpl(
  id: number,
  userId: string,
  data: Partial<Omit<typeof tasks.$inferInsert, "userId">> & {
    labelIds?: number[];
    expectedUpdatedAt?: Date | string | null;
  },
  existingTask?: Awaited<ReturnType<typeof getTaskImpl>> | null
) {
  const user = await requireUser(userId);

  if (!isValidId(id)) {
    throw new NotFoundError("Task not found or access denied");
  }

  const parsedData = updateTaskSchema.parse(data);
  const { labelIds, expectedUpdatedAt, dueDatePrecision: rawPrecision, ...taskData } = parsedData;

  const currentTask = existingTask ?? await getTaskImpl(id, userId);
  if (!currentTask) {
    throw new NotFoundError("Task not found or access denied");
  }

  if (expectedUpdatedAt) {
    const expected = typeof expectedUpdatedAt === "string" ? new Date(expectedUpdatedAt) : expectedUpdatedAt;
    if (currentTask.updatedAt && currentTask.updatedAt.getTime() > expected.getTime()) {
      throw new ConflictError(
        "This task was modified by another device. Please review the changes.",
        currentTask
      );
    }
  }

  const shouldClearDue = taskData.dueDate === null;
  const precision = shouldClearDue
    ? null
    : coerceDuePrecision(taskData.dueDate ?? currentTask.dueDate, rawPrecision ?? currentTask.dueDatePrecision ?? null);
  const normalizedDueDate = taskData.dueDate
    ? (precision
      ? normalizeDueAnchor(taskData.dueDate, precision, user.weekStartsOnMonday ?? false)
      : taskData.dueDate)
    : taskData.dueDate === null
      ? null
      : undefined;

  const updatePayload = {
    ...taskData,
    dueDate: normalizedDueDate === undefined ? taskData.dueDate : normalizedDueDate,
    dueDatePrecision: shouldClearDue ? null : precision ?? undefined,
    updatedAt: new Date(),
  } as Partial<typeof tasks.$inferInsert>;

  // Validate list ownership before updating
  if (taskData.listId !== undefined && taskData.listId !== currentTask.listId) {
    if (taskData.listId !== null && !isValidId(taskData.listId)) {
      throw new Error("Invalid list ID");
    }

    if (taskData.listId) {
       const toList = await getListInternal(taskData.listId, userId);
       if (!toList) {
          throw new NotFoundError("List not found or access denied");
       }
    }
  }

  await db
    .update(tasks)
    .set(updatePayload)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));

  if (labelIds !== undefined) {
    await db.delete(taskLabels).where(eq(taskLabels.taskId, id));
    if (labelIds.length > 0) {
      const validLabels = await db
        .select({ id: labels.id })
        .from(labels)
        .where(and(eq(labels.userId, userId), inArray(labels.id, labelIds)));

      const validLabelIds = validLabels.map((l) => l.id);

      if (validLabelIds.length > 0) {
        await db.insert(taskLabels).values(
          validLabelIds.map((labelId: number) => ({
            taskId: id,
            labelId,
          }))
        );
      }
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

  if (taskData.dueDate !== undefined || rawPrecision !== undefined) {
    const currentDueDate = currentTask.dueDate ? currentTask.dueDate.getTime() : null;
    const newDueDate = normalizedDueDate === undefined
      ? taskData.dueDate
      : normalizedDueDate;
    const newDueTime = newDueDate ? newDueDate.getTime() : null;
    const currentPrecision = currentTask.dueDatePrecision ?? "day";
    const nextPrecision = shouldClearDue
      ? "day"
      : (precision ?? currentPrecision);
    if (currentDueDate !== newDueTime || currentPrecision !== nextPrecision) {
      const fromDate = currentTask.dueDate ? currentTask.dueDate.toLocaleDateString() : "(none)";
      const toDate = newDueDate ? newDueDate.toLocaleDateString() : "(none)";
      const fromLabel = currentPrecision === "day" ? "date" : currentPrecision;
      changes.push(`Due ${fromLabel} changed from ${fromDate} to ${toDate}`);
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
    const [fromList, toList] = await Promise.all([
      currentTask.listId ? getListInternal(currentTask.listId, userId) : Promise.resolve(null),
      taskData.listId ? getListInternal(taskData.listId, userId) : Promise.resolve(null),
    ]);

    const fromListName = fromList?.name || "Inbox";
    const toListName = toList?.name || "Inbox";

    changes.push(`List changed from "${fromListName}" to "${toListName}"`);
  }

  if (labelIds !== undefined) {
    const currentLabelIds = currentTask.labels.map((l) => l.id).sort();
    const newLabelIds = [...labelIds].sort();

    if (JSON.stringify(currentLabelIds) !== JSON.stringify(newLabelIds)) {
      const currentLabelNamesMap = new Map(currentTask.labels.map((l) => [l.id, l.name || "Unknown"]));

      const labelsToFetch = newLabelIds.filter(id => !currentLabelNamesMap.has(id));

      const allRelevantLabelsMap = new Map(currentLabelNamesMap);
      if (labelsToFetch.length > 0) {
        const fetchedLabels = await db
          .select({ id: labels.id, name: labels.name })
          .from(labels)
          .where(and(eq(labels.userId, userId), inArray(labels.id, labelsToFetch)));

        for (const label of fetchedLabels) {
          allRelevantLabelsMap.set(label.id, label.name || "Unknown");
        }
      }

      const currentLabelNames = Array.from(currentLabelNamesMap.values());
      const newLabelNames = newLabelIds.map(id => allRelevantLabelsMap.get(id) || "Unknown");

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

  const { syncTodoistNow } = await import("@/lib/actions/todoist");
  await syncTodoistNow();

  revalidatePath("/", "layout");
}

export const updateTask: (
  id: number,
  userId: string,
  data: Partial<Omit<typeof tasks.$inferInsert, "userId">> & {
    labelIds?: number[];
    expectedUpdatedAt?: Date | string | null;
  },
  existingTask?: Awaited<ReturnType<typeof getTaskImpl>> | null
) => Promise<ActionResult<void>> = withErrorHandling(updateTaskImpl);

async function deleteTaskImpl(id: number, userId: string) {
  await requireUser(userId);

  if (!isValidId(id)) {
    throw new NotFoundError("Task not found or access denied");
  }

  const existingTask = await getTaskImpl(id, userId);
  if (!existingTask) {
    throw new NotFoundError("Task not found or access denied");
  }

  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  const { syncTodoistNow } = await import("@/lib/actions/todoist");
  await syncTodoistNow();
  revalidatePath("/", "layout");
}

export const deleteTask: (
  id: number,
  userId: string
) => Promise<ActionResult<void>> = withErrorHandling(deleteTaskImpl);

async function toggleTaskCompletionImpl(id: number, userId: string, isCompleted: boolean) {
  await requireUser(userId);

  if (!isValidId(id)) {
    throw new NotFoundError("Task not found or access denied");
  }

  const task = await getTaskImpl(id, userId);
  if (!task) {
    throw new NotFoundError("Task not found or access denied");
  }

  if (isCompleted && task.isRecurring && task.recurringRule) {
    const { RRule } = await import("rrule");
    const rule = RRule.fromString(task.recurringRule);
    const nextDate = rule.after(new Date(), true);

    if (nextDate) {
      const { labels } = task;

      await createTaskImpl({
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
        dueDatePrecision: task.dueDatePrecision ?? null,
        isCompleted: false,
        completedAt: null,
        labelIds: labels.map((l) => l.id).filter((id): id is number => id !== null),
      });
    }
  }

  await updateTaskImpl(
    id,
    userId,
    {
      isCompleted,
      completedAt: isCompleted ? new Date() : null,
    },
    task
  );

  const logPromise = db.insert(taskLogs).values({
    userId,
    taskId: id,
    action: isCompleted ? "completed" : "uncompleted",
    details: isCompleted ? "Task marked as completed" : "Task marked as uncompleted",
  });

  const blockedTasksPromise = (async () => {
    if (isCompleted) {
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
            details: `Blocker "${task.title}" completed.${isNowUnblocked ? " Task is now unblocked!" : ""}`,
          };
        });

        if (logsToInsert.length > 0) {
          await db.insert(taskLogs).values(logsToInsert);
        }
      }
    }
  })();

  const baseXP = 10;
  let bonusXP = 0;
  if (task.priority === "medium") bonusXP += 5;
  if (task.priority === "high") bonusXP += 10;

  const gamificationPromise = updateUserProgress(userId, baseXP + bonusXP);

  const [, , progressResult] = await Promise.all([
    logPromise,
    blockedTasksPromise,
    gamificationPromise,
  ]);

  return {
    newXP: progressResult.newXP,
    newLevel: progressResult.newLevel,
    leveledUp: progressResult.leveledUp,
  };
}

export const toggleTaskCompletion: (
  id: number,
  userId: string,
  isCompleted: boolean
) => Promise<ActionResult<{ newXP: number; newLevel: number; leveledUp: boolean } | undefined>> = withErrorHandling(toggleTaskCompletionImpl);

async function reorderTasksImpl(userId: string, items: { id: number; position: number }[]) {
  await requireUser(userId);

  if (items.length === 0) {
    return;
  }

  const taskIds = items.map((i) => i.id);
  const caseWhen = sql.join(
    items.map((item) => sql`WHEN ${tasks.id} = ${item.id} THEN ${item.position}`),
    sql` `
  );

  await db
    .update(tasks)
    .set({
      position: sql`CASE ${caseWhen} ELSE ${tasks.position} END`,
    })
    .where(and(inArray(tasks.id, taskIds), eq(tasks.userId, userId)));

  await db.insert(taskLogs).values({
    userId,
    taskId: null,
    action: "reorder",
    details: `Reordered ${items.length} tasks`,
  });

  revalidatePath("/");
}

export const reorderTasks = withErrorHandling(reorderTasksImpl);
