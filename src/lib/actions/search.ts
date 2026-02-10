"use server";

import {
  db,
  lists,
  tasks,
  labels,
  taskLabels,
  taskDependencies,
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
} from "./shared";
import { rateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/auth";

export type SearchAllResponse = {
  tasks: {
    id: number;
    title: string;
    description: string | null;
    icon?: string | null;
    priority: "none" | "low" | "medium" | "high" | null;
    dueDate: Date | null;
    deadline: Date | null;
    isCompleted: boolean | null;
    estimateMinutes: number | null;
    position: number;
    actualMinutes: number | null;
    isRecurring: boolean | null;
    listId: number | null;
    listName?: string | null;
    listColor?: string | null;
    listIcon?: string | null;
    recurringRule: string | null;
    energyLevel: "high" | "medium" | "low" | null;
    context:
      | "computer"
      | "phone"
      | "errands"
      | "meeting"
      | "home"
      | "anywhere"
      | null;
    isHabit: boolean | null;
    labels?: Array<{
      id: number;
      name: string;
      color: string | null;
      icon: string | null;
    }>;
    blockedByCount?: number;
    subtasks?: Array<{
      id: number;
      parentId: number | null;
      title: string;
      isCompleted: boolean | null;
      estimateMinutes: number | null;
    }>;
    subtaskCount?: number;
    completedSubtaskCount?: number;
    updatedAt?: Date | string | null;
    createdAt: Date | string;
  }[];
  lists: Array<{
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
    slug: string;
    description: string | null;
  }>;
  labels: Array<{
    id: number;
    name: string;
    color: string | null;
    icon: string | null;
    description: string | null;
  }>;
  totalTasks: number;
  nextCursor: number | null;
  hasMore: boolean;
};

export async function searchAll(
  userId: string,
  query: string,
  options?: {
    listId?: number | null;
    labelId?: number;
    priority?: "none" | "low" | "medium" | "high";
    status?: "all" | "completed" | "active";
    dueDateFrom?: string;
    dueDateTo?: string;
    sort?: "relevance" | "created" | "due" | "priority";
    sortOrder?: "asc" | "desc";
    cursor?: number;
    limit?: number;
  }
): Promise<SearchAllResponse> {
  await requireUser(userId);

  const rateLimitResult = await rateLimit(
    `search:all:${userId}`,
    300,
    3600
  );
  if (!rateLimitResult.success) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  if (!query || query.length < 1) {
    return {
      tasks: [],
      lists: [],
      labels: [],
      totalTasks: 0,
      nextCursor: null,
      hasMore: false,
    };
  }

  const pageLimit = options?.limit ?? 20;
  const lowerQuery = `%${query.toLowerCase()}%`;

  const taskConditions = [
    eq(tasks.userId, userId),
    isNull(tasks.parentId),
    sql`(lower(${tasks.title}) LIKE ${lowerQuery} OR lower(${tasks.description}) LIKE ${lowerQuery})`,
  ];

  if (options?.listId !== undefined) {
    if (options.listId === null) {
      taskConditions.push(isNull(tasks.listId));
    } else {
      taskConditions.push(eq(tasks.listId, options.listId));
    }
  }

  if (options?.labelId) {
    const taskIdsSubquery = db
      .select({ taskId: taskLabels.taskId })
      .from(taskLabels)
      .where(eq(taskLabels.labelId, options.labelId));
    taskConditions.push(inArray(tasks.id, taskIdsSubquery));
  }

  if (options?.priority) {
    taskConditions.push(eq(tasks.priority, options.priority));
  }

  if (options?.status === "completed") {
    taskConditions.push(eq(tasks.isCompleted, true));
  } else if (options?.status === "active") {
    taskConditions.push(eq(tasks.isCompleted, false));
  }

  if (options?.dueDateFrom) {
    taskConditions.push(gte(tasks.dueDate, new Date(options.dueDateFrom)));
  }

  if (options?.dueDateTo) {
    taskConditions.push(lte(tasks.dueDate, new Date(options.dueDateTo)));
  }

  if (options?.cursor) {
    taskConditions.push(sql`${tasks.id} < ${options.cursor}`);
  }

  let orderBy;
  const sortOrder = options?.sortOrder ?? "desc";
  switch (options?.sort) {
    case "created":
      orderBy =
        sortOrder === "asc" ? asc(tasks.createdAt) : desc(tasks.createdAt);
      break;
    case "due":
      orderBy =
        sortOrder === "asc" ? asc(tasks.dueDate) : desc(tasks.dueDate);
      break;
    case "priority":
      orderBy =
        sortOrder === "asc"
          ? asc(
              sql`CASE ${tasks.priority} WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END`
            )
          : desc(
              sql`CASE ${tasks.priority} WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END`
            );
      break;
    default:
      orderBy = desc(tasks.createdAt);
  }

  const [tasksResult, countResult, listsResult, labelsResult] =
    await Promise.all([
      db
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          icon: tasks.icon,
          priority: tasks.priority,
          dueDate: tasks.dueDate,
          deadline: tasks.deadline,
          isCompleted: tasks.isCompleted,
          estimateMinutes: tasks.estimateMinutes,
          position: tasks.position,
          actualMinutes: tasks.actualMinutes,
          isRecurring: tasks.isRecurring,
          listId: tasks.listId,
          recurringRule: tasks.recurringRule,
          energyLevel: tasks.energyLevel,
          context: tasks.context,
          isHabit: tasks.isHabit,
          createdAt: tasks.createdAt,
          updatedAt: tasks.updatedAt,
          listName: lists.name,
          listColor: lists.color,
          listIcon: lists.icon,
        })
        .from(tasks)
        .leftJoin(lists, eq(tasks.listId, lists.id))
        .where(and(...taskConditions))
        .orderBy(orderBy)
        .limit(pageLimit + 1),

      db
        .select({ count: sql<number>`count(*)` })
        .from(tasks)
        .where(and(...taskConditions)),

      db
        .select({
          id: lists.id,
          name: lists.name,
          color: lists.color,
          icon: lists.icon,
          slug: lists.slug,
          description: lists.description,
        })
        .from(lists)
        .where(
          and(
            eq(lists.userId, userId),
            or(
              sql`lower(${lists.name}) LIKE ${lowerQuery}`,
              sql`lower(${lists.description}) LIKE ${lowerQuery}`
            )
          )
        ),

      db
        .select({
          id: labels.id,
          name: labels.name,
          color: labels.color,
          icon: labels.icon,
          description: labels.description,
        })
        .from(labels)
        .where(
          and(
            eq(labels.userId, userId),
            or(
              sql`lower(${labels.name}) LIKE ${lowerQuery}`,
              sql`lower(${labels.description}) LIKE ${lowerQuery}`
            )
          )
        ),
    ]);

  const hasMore = tasksResult.length > pageLimit;
  const paginatedTasks = hasMore
    ? tasksResult.slice(0, pageLimit)
    : tasksResult;
  const totalTasks = Number(countResult[0]?.count ?? 0);

  const taskIds = paginatedTasks.map((t) => t.id);

  if (taskIds.length === 0) {
    return {
      tasks: [],
      lists: listsResult,
      labels: labelsResult,
      totalTasks,
      nextCursor: null,
      hasMore: false,
    };
  }

  const [taskLabelsResult, subtasksResult, blockedCountsResult] =
    await Promise.all([
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

  const blockedCountMap = new Map(
    blockedCountsResult.map((r) => [r.taskId, Number(r.count)])
  );

  const labelsByTaskId = new Map<
    number,
    { id: number; name: string; color: string | null; icon: string | null }[]
  >();
  for (const label of taskLabelsResult) {
    const list = labelsByTaskId.get(label.taskId) ?? [];
    list.push({
      id: label.labelId,
      name: label.name || "",
      color: label.color || "#000000",
      icon: label.icon,
    });
    labelsByTaskId.set(label.taskId, list);
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

  const hydratedTasks = paginatedTasks.map((task) => ({
    ...task,
    labels: labelsByTaskId.get(task.id) ?? [],
    subtasks: subtasksByParentId.get(task.id) ?? [],
    subtaskCount: (subtasksByParentId.get(task.id) ?? []).length,
    completedSubtaskCount:
      completedSubtaskCountByParentId.get(task.id) ?? 0,
    blockedByCount: blockedCountMap.get(task.id) || 0,
  }));

  const nextCursor = hasMore
    ? paginatedTasks[paginatedTasks.length - 1].id
    : null;

  return {
    tasks: hydratedTasks,
    lists: listsResult,
    labels: labelsResult,
    totalTasks,
    nextCursor,
    hasMore,
  };
}
