"use server";

import {
  db,
  lists,
  tasks,
  labels,
  taskLabels,
  reminders,
  taskDependencies,
  sqliteConnection,
  eq,
  and,
  desc,
  asc,
  gte,
  lte,
  inArray,
  sql,
  isNull,
  or,
  startOfDay,
  endOfDay,
  addDays,
  addWeeks,
  startOfWeek,
  withErrorHandling,
} from "../shared";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/auth";
import { getLabelsInternal } from "../labels";
import { isValidId } from "./helpers";

async function getTasksImpl(
  userId: string,
  listId?: number | null,
  filter?: "today" | "upcoming" | "all" | "completed" | "next-7-days",
  labelId?: number,
  showCompleted: boolean = true
) {
  const user = await requireUser(userId);

  if (listId !== undefined && listId !== null && !isValidId(listId)) {
    return [];
  }
  if (labelId !== undefined && !isValidId(labelId)) {
    return [];
  }

  const conditions = [];
  conditions.push(eq(tasks.userId, userId));
  conditions.push(isNull(tasks.parentId));

  if (filter === "completed") {
    conditions.push(eq(tasks.isCompleted, true));
  } else if (!showCompleted) {
    conditions.push(eq(tasks.isCompleted, false));
  }

  if (listId) {
    conditions.push(eq(tasks.listId, listId));
  } else if (listId === null) {
    conditions.push(isNull(tasks.listId));
  }

  if (labelId) {
    const taskIdsSubquery = db
      .select({ taskId: taskLabels.taskId })
      .from(taskLabels)
      .where(eq(taskLabels.labelId, labelId));

    conditions.push(inArray(tasks.id, taskIdsSubquery));
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStartsOnMonday = user.weekStartsOnMonday ?? false;
  const weekStartsOn = weekStartsOnMonday ? 1 : 0;
  const weekStart = startOfWeek(todayStart, { weekStartsOn });
  const monthStart = startOfDay(new Date(todayStart.getFullYear(), todayStart.getMonth(), 1));
  const yearStart = startOfDay(new Date(todayStart.getFullYear(), 0, 1));

  if (filter === "today") {
    const todayWindow = and(
      or(isNull(tasks.dueDatePrecision), eq(tasks.dueDatePrecision, "day")),
      gte(tasks.dueDate, todayStart),
      lte(tasks.dueDate, todayEnd)
    );
    const weekWindow = and(
      eq(tasks.dueDatePrecision, "week"),
      gte(tasks.dueDate, weekStart),
      lte(tasks.dueDate, todayStart)
    );
    const monthWindow = and(
      eq(tasks.dueDatePrecision, "month"),
      gte(tasks.dueDate, monthStart),
      lte(tasks.dueDate, todayStart)
    );
    const yearWindow = and(
      eq(tasks.dueDatePrecision, "year"),
      gte(tasks.dueDate, yearStart),
      lte(tasks.dueDate, todayStart)
    );
    conditions.push(or(todayWindow, weekWindow, monthWindow, yearWindow));
  } else if (filter === "upcoming") {
    const upcomingDay = and(
      or(isNull(tasks.dueDatePrecision), eq(tasks.dueDatePrecision, "day")),
      gte(tasks.dueDate, todayStart)
    );
    const upcomingWeek = and(
      eq(tasks.dueDatePrecision, "week"),
      gte(tasks.dueDate, startOfDay(addWeeks(weekStart, 1)))
    );
    const upcomingMonth = and(
      eq(tasks.dueDatePrecision, "month"),
      gte(tasks.dueDate, startOfDay(new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)))
    );
    const upcomingYear = and(
      eq(tasks.dueDatePrecision, "year"),
      gte(tasks.dueDate, startOfDay(new Date(yearStart.getFullYear() + 1, 0, 1)))
    );
    conditions.push(or(upcomingDay, upcomingWeek, upcomingMonth, upcomingYear));
  } else if (filter === "next-7-days") {
    const nextWeek = addDays(now, 7);
    conditions.push(and(gte(tasks.dueDate, todayStart), lte(tasks.dueDate, nextWeek)));
  }

  // ⚡ Bolt Opt: Start fetching labels in parallel with tasks.
  // getLabelsInternal uses unstable_cache, so it's usually fast, but this saves ~20-50ms of sequential latency.
  const labelsPromise = getLabelsInternal(userId);

  const tasksResult = await db
    .select({
      id: tasks.id,
      listId: tasks.listId,
      title: tasks.title,
      description: tasks.description,
      icon: tasks.icon,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      dueDatePrecision: tasks.dueDatePrecision,
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
      listName: lists.name,
      listColor: lists.color,
      listIcon: lists.icon,
    })
    .from(tasks)
    .leftJoin(lists, eq(tasks.listId, lists.id))
    .where(and(...conditions))
    .orderBy(asc(tasks.isCompleted), asc(tasks.position), desc(tasks.createdAt));

  const taskIds = tasksResult.map((t) => t.id);
  if (taskIds.length === 0) {
    // Ensure we don't leave an unhandled rejection if labels fail
    labelsPromise.catch(() => {});
    return [];
  }

  // ⚡ Bolt Opt: Fetch all related data (labels, subtasks, blocked counts) in parallel.
  // We await labelsPromise here along with other relation queries.
  const relationsPromise = Promise.all([
    db
      .select({
        taskId: taskLabels.taskId,
        labelId: taskLabels.labelId,
      })
      .from(taskLabels)
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
      .orderBy(asc(tasks.isCompleted), asc(tasks.createdAt)),

    db
      .select({
        taskId: taskDependencies.taskId,
        count: sql<number>`count(*)`,
      })
      .from(taskDependencies)
      .where(inArray(taskDependencies.taskId, taskIds))
      .groupBy(taskDependencies.taskId),
  ]);

  const [allLabels, [taskLabelsResult, subtasksResult, blockedCountsResult]] = await Promise.all([
    labelsPromise,
    relationsPromise
  ]);

  // ⚡ Bolt Opt: Avoid intermediate array allocation by populating Map directly.
  // Original: blockedCountsResult.map(...) -> new Array -> new Map
  const blockedCountMap = new Map<number, number>();
  for (const r of blockedCountsResult) {
    blockedCountMap.set(r.taskId, Number(r.count));
  }

  // ⚡ Bolt Opt: Deduplicate label objects to reduce GC pressure.
  // Instead of creating N new label objects for N task-label links, we create M objects (where M is unique labels)
  // and reuse references. For 1000 tasks with 2 labels each, this saves ~1980 object allocations.
  const labelsMap = new Map<number, { id: number; name: string; color: string; icon: string | null }>();
  for (const l of allLabels) {
    labelsMap.set(l.id, {
      id: l.id,
      name: l.name,
      color: l.color || "#000000",
      icon: l.icon
    });
  }

  const labelsByTaskId = new Map<number, { id: number; name: string; color: string; icon: string | null }[]>();
  for (const labelLink of taskLabelsResult) {
    const label = labelsMap.get(labelLink.labelId);
    if (label) {
      let list = labelsByTaskId.get(labelLink.taskId);
      if (!list) {
        list = [];
        labelsByTaskId.set(labelLink.taskId, list);
      }
      list.push(label);
    }
  }

  const subtasksByParentId = new Map<number, typeof subtasksResult>();
  const completedSubtaskCountByParentId = new Map<number, number>();
  for (const subtask of subtasksResult) {
    if (!subtask.parentId) continue;
    const list = subtasksByParentId.get(subtask.parentId) ?? [];
    list.push(subtask);
    subtasksByParentId.set(subtask.parentId, list);
    if (subtask.isCompleted) {
      completedSubtaskCountByParentId.set(
        subtask.parentId,
        (completedSubtaskCountByParentId.get(subtask.parentId) ?? 0) + 1
      );
    }
  }

  const tasksWithLabelsAndSubtasks = tasksResult.map((task) => {
    const taskLabelsList = labelsByTaskId.get(task.id) ?? [];
    const taskSubtasks = subtasksByParentId.get(task.id) ?? [];
    const completedSubtaskCount = completedSubtaskCountByParentId.get(task.id) ?? 0;

    return {
      ...task,
      labels: taskLabelsList,
      subtasks: taskSubtasks,
      subtaskCount: taskSubtasks.length,
      completedSubtaskCount,
      blockedByCount: blockedCountMap.get(task.id) || 0,
    };
  });

  return tasksWithLabelsAndSubtasks;
}

export const getTasks = withErrorHandling(getTasksImpl);

export async function getTaskImpl(id: number, userId: string) {
  await requireUser(userId);

  if (!isValidId(id)) return null;

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
      dueDatePrecision: tasks.dueDatePrecision,
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

export const getTask = withErrorHandling(getTaskImpl);

async function searchTasksImpl(userId: string, query: string) {
  await requireUser(userId);

  if (!query || query.trim().length === 0) return [];

  const limit = await rateLimit(`task:search:${userId}`, 500, 3600);
  if (!limit.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  const normalizedQuery = query.trim().toLowerCase();
  const likeQuery = `%${normalizedQuery}%`;
  const isSqlite = !!sqliteConnection;
  const useTrigram = !isSqlite && normalizedQuery.length >= 3;
  const searchCondition = useTrigram
    ? sql`(lower(${tasks.title}) % ${normalizedQuery} OR lower(coalesce(${tasks.description}, '')) % ${normalizedQuery})`
    : sql`(lower(${tasks.title}) LIKE ${likeQuery} OR lower(${tasks.description}) LIKE ${likeQuery})`;

  const result = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      listId: tasks.listId,
      isCompleted: tasks.isCompleted,
      dueDate: tasks.dueDate,
      dueDatePrecision: tasks.dueDatePrecision,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.userId, userId),
        searchCondition
      )
    )
    .orderBy(
      useTrigram
        ? desc(
            sql`greatest(similarity(lower(${tasks.title}), ${normalizedQuery}), similarity(lower(coalesce(${tasks.description}, '')), ${normalizedQuery}))`
          )
        : desc(tasks.createdAt)
    )
    .limit(10);

  return result;
}

export const searchTasks = withErrorHandling(searchTasksImpl);

async function getTasksForSearchImpl(userId: string) {
  await requireUser(userId);

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
    .limit(2000);

  return result;
}

export const getTasksForSearch = withErrorHandling(getTasksForSearchImpl);
