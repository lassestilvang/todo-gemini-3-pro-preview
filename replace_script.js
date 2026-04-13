import fs from "fs";

let content = fs.readFileSync("src/lib/todoist/sync.ts", "utf-8");

const target = `    const remoteCompletedAt = parseTodoistTimestamp(remoteTask.completedAt);
    await db
      .update(tasks)
      .set({
        title: localPayload.title ?? localTask.title,
        description: localPayload.description ?? localTask.description,
        priority: localPayload.priority ?? localTask.priority,
        dueDate: localPayload.dueDate ?? localTask.dueDate,
        dueDatePrecision:
          localPayload.dueDatePrecision ?? localTask.dueDatePrecision,
        deadline: localPayload.deadline ?? localTask.deadline,
        estimateMinutes:
          localPayload.estimateMinutes ?? localTask.estimateMinutes,
        isRecurring: localPayload.isRecurring ?? localTask.isRecurring,
        recurringRule: localPayload.recurringRule ?? localTask.recurringRule,
        isCompleted: localPayload.isCompleted ?? localTask.isCompleted,
        completedAt: localPayload.isCompleted
          ? (remoteCompletedAt ?? new Date())
          : null,
        listId: resolvedListId,
        parentId: resolvedParentId,
      })
      .where(and(eq(tasks.id, localTask.id), eq(tasks.userId, userId)));`;

const replacement = `    const remoteCompletedAt = parseTodoistTimestamp(remoteTask.completedAt);
    // ⚡ Bolt Opt: Replaced sequential db.update() with concurrent promises
    taskUpdatePromises.push(
      db
        .update(tasks)
        .set({
          title: localPayload.title ?? localTask.title,
          description: localPayload.description ?? localTask.description,
          priority: localPayload.priority ?? localTask.priority,
          dueDate: localPayload.dueDate ?? localTask.dueDate,
          dueDatePrecision:
            localPayload.dueDatePrecision ?? localTask.dueDatePrecision,
          deadline: localPayload.deadline ?? localTask.deadline,
          estimateMinutes:
            localPayload.estimateMinutes ?? localTask.estimateMinutes,
          isRecurring: localPayload.isRecurring ?? localTask.isRecurring,
          recurringRule: localPayload.recurringRule ?? localTask.recurringRule,
          isCompleted: localPayload.isCompleted ?? localTask.isCompleted,
          completedAt: localPayload.isCompleted
            ? (remoteCompletedAt ?? new Date())
            : null,
          listId: resolvedListId,
          parentId: resolvedParentId,
        })
        .where(and(eq(tasks.id, localTask.id), eq(tasks.userId, userId)))
    );`;

// Wait, the file we are targeting is src/lib/google-tasks/sync.ts, let's verify again
