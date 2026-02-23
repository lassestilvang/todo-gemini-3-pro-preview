import { describe, expect, it, beforeAll, mock, beforeEach } from "bun:test";
import { and, eq } from "drizzle-orm";
import { setupTestDb, createTestUser } from "@/test/setup";
import { db, externalIntegrations, tasks } from "@/db";
import { setMockAuthUser } from "@/test/mocks";
import {
    createTask, getTasks, updateTask, deleteTask, getTask, createReminder, getReminders, getTaskLogs,
    createList, getLists, updateList, deleteList, getList,
    createLabel, getLabels, updateLabel, deleteLabel, getLabel,
    createSubtask, getSubtasks, updateSubtask, deleteSubtask,
    addDependency, removeDependency, getBlockers, getBlockedTasks,
    createTemplate, getTemplates, deleteTemplate, instantiateTemplate, updateTemplate,
    addXP, getUserStats, getUserAchievements,
    searchTasks, toggleTaskCompletion,
    getActivityLog, deleteReminder,
    getViewSettings, saveViewSettings, resetViewSettings
} from "./actions";
import { rotateTodoistTokens } from "./actions/todoist";
import { encryptToken, resetTodoistKeyRingForTests } from "@/lib/todoist/crypto";
import { isSuccess } from "./action-result";
import { normalizeDueAnchor } from "./due-utils";
import { reorderTasks } from "./actions/tasks";

mock.module("next/cache", () => ({
    revalidatePath: () => { },
}));

// Mock gamification helpers to avoid complex logic in integration tests if needed,
// but since we have a DB, we can test them directly.
// However, calculateLevel is imported from gamification.ts, which is pure logic.
// suggestMetadata is from smart-tags.ts, which might use Gemini. We should mock suggestMetadata.

mock.module("./smart-tags", () => ({
    suggestMetadata: mock(() => Promise.resolve({ listId: null, labelIds: [] }))
}));

const unwrap = <T>(result: { success: boolean; data?: T; error?: { message?: string } }) => {
    if (!result.success) {
        throw new Error(result.error?.message ?? "Action failed");
    }
    return result.data as T;
};

describe("Server Actions", () => {
    let testUserId: string;
    let testUser: any;

    beforeAll(async () => {
        // Ensure tables exist for this test suite
        await setupTestDb();
        // await resetTestDb();
    });

    beforeEach(async () => {
        // Use unique ID per test for maximum isolation in shared process
        const randomId = Math.random().toString(36).substring(7);
        testUserId = `user_${randomId}`;

        // Create the user
        const user = await createTestUser(testUserId, `${testUserId}@example.com`);
        testUser = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePictureUrl: user.profilePictureUrl
        };

        // Set the mock auth user so that requireUser() checks pass
        setMockAuthUser(testUser);
    });

    describe("reorderTasks", () => {
        it("should reorder tasks successfully within limit", async () => {
            const task1 = unwrap(await createTask({ userId: testUserId, title: "Task 1" }));
            const task2 = unwrap(await createTask({ userId: testUserId, title: "Task 2" }));

            const result = await reorderTasks(testUserId, [
                { id: task1.id, position: 100 },
                { id: task2.id, position: 200 }
            ]);

            expect(isSuccess(result)).toBe(true);
        });

        it("should fail when items exceed limit", async () => {
            // Generate 1001 items
            const items = Array.from({ length: 1001 }, (_, i) => ({
                id: i,
                position: i
            }));

            const result = await reorderTasks(testUserId, items);

            expect(isSuccess(result)).toBe(false);
            if (!isSuccess(result)) {
                expect(result.error.code).toBe("VALIDATION_ERROR");
                expect(result.error.message).toContain("Limit is 1000");
            }
        });
    });

    describe("Tasks", () => {
        it("should create a task", async () => {
            const task = unwrap(await createTask({
                userId: testUserId,
                title: "Test Task",
                description: "This is a test task",
                priority: "high",
            }));

            expect(task).toBeDefined();
            expect(task.title).toBe("Test Task");
            expect(task.id).toBeDefined();
        });

        it("should get tasks", async () => {
            const task = unwrap(await createTask({ userId: testUserId, title: "Get Test Task" }));
            const allTasks = unwrap(await getTasks(testUserId, undefined, "all"));
            expect(allTasks.length).toBeGreaterThan(0);
            const found = allTasks.find((t) => t.id === task.id);
            expect(found).toBeDefined();
        });

        it("should get a single task", async () => {
            const task = unwrap(await createTask({ userId: testUserId, title: "Single Task" }));
            const fetchedTaskResult = await getTask(task.id, testUserId);
            expect(isSuccess(fetchedTaskResult)).toBe(true);
            if (!isSuccess(fetchedTaskResult)) return;
            expect(fetchedTaskResult.data).toBeDefined();
            expect(fetchedTaskResult.data?.id).toBe(task.id);
        });

        it("should update a task", async () => {
            const task = unwrap(await createTask({ userId: testUserId, title: "Original Task" }));
            expect(isSuccess(await updateTask(task.id, testUserId, { title: "Updated Task" }))).toBe(true);
            const updatedResult = await getTask(task.id, testUserId);
            expect(isSuccess(updatedResult)).toBe(true);
            if (!isSuccess(updatedResult)) return;
            expect(updatedResult.data?.title).toBe("Updated Task");
        });

        it("should delete a task", async () => {
            const task = unwrap(await createTask({ userId: testUserId, title: "Task to Delete" }));
            expect(isSuccess(await deleteTask(task.id, testUserId))).toBe(true);
            const deletedResult = await getTask(task.id, testUserId);
            expect(isSuccess(deletedResult)).toBe(true);
            if (!isSuccess(deletedResult)) return;
            expect(deletedResult.data).toBeNull();
        });

        it("should create a task with deadline", async () => {
            const deadline = new Date();
            deadline.setMilliseconds(0);
            const task = unwrap(await createTask({
                userId: testUserId,
                title: "Deadline Task",
                deadline
            }));
            expect(task.deadline).toBeDefined();
            expect(task.deadline?.getTime()).toBe(deadline.getTime());
        });

        it("should create a task with week precision", async () => {
            const rawDue = new Date("2025-04-09T12:00:00Z");
            const task = unwrap(await createTask({
                userId: testUserId,
                title: "Week Task",
                dueDate: rawDue,
                dueDatePrecision: "week",
            }));
            const expected = normalizeDueAnchor(rawDue, "week", false);
            expect(task.dueDatePrecision).toBe("week");
            expect(task.dueDate?.toISOString()).toBe(expected.toISOString());
        });

        it("should toggle task completion", async () => {
            const task = unwrap(await createTask({ userId: testUserId, title: "Task to Complete" }));
            expect(isSuccess(await toggleTaskCompletion(task.id, testUserId, true))).toBe(true);
            const completedResult = await getTask(task.id, testUserId);
            expect(isSuccess(completedResult)).toBe(true);
            if (!isSuccess(completedResult)) return;
            expect(completedResult.data?.isCompleted).toBe(true);
            expect(completedResult.data?.completedAt).toBeDefined();

            expect(isSuccess(await toggleTaskCompletion(task.id, testUserId, false))).toBe(true);
            const uncompletedResult = await getTask(task.id, testUserId);
            expect(isSuccess(uncompletedResult)).toBe(true);
            if (!isSuccess(uncompletedResult)) return;
            expect(uncompletedResult.data?.isCompleted).toBe(false);
            expect(uncompletedResult.data?.completedAt).toBeNull();
        });
    });

    describe("Task Filters", () => {
        it("should filter tasks by list", async () => {
            const list1Result = await createList({ userId: testUserId, name: "List 1", slug: "l1" });
            const list2Result = await createList({ userId: testUserId, name: "List 2", slug: "l2" });
            expect(isSuccess(list1Result)).toBe(true);
            expect(isSuccess(list2Result)).toBe(true);
            if (!isSuccess(list1Result) || !isSuccess(list2Result)) return;
            const list1 = list1Result.data;
            const list2 = list2Result.data;
            const task1 = unwrap(await createTask({ userId: testUserId, title: "Task 1", listId: list1.id }));
            unwrap(await createTask({ userId: testUserId, title: "Task 2", listId: list2.id }));

            const tasks = unwrap(await getTasks(testUserId, list1.id));
            expect(tasks).toHaveLength(1);
            expect(tasks[0].id).toBe(task1.id);
        });

        it("should filter tasks by label", async () => {
            const labelResult = await createLabel({ userId: testUserId, name: "Label 1" });
            expect(isSuccess(labelResult)).toBe(true);
            if (!isSuccess(labelResult)) return;
            const label = labelResult.data;
            const task = unwrap(await createTask({ userId: testUserId, title: "Task with Label", labelIds: [label.id] }));
            unwrap(await createTask({ userId: testUserId, title: "Task without Label" }));

            const tasks = unwrap(await getTasks(testUserId, undefined, "all", label.id));
            expect(tasks).toHaveLength(1);
            expect(tasks[0].id).toBe(task.id);
        });

        it("should filter tasks by date (today)", async () => {
            const today = new Date();
            const task = unwrap(await createTask({ userId: testUserId, title: "Today Task", dueDate: today }));
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            unwrap(await createTask({ userId: testUserId, title: "Tomorrow Task", dueDate: tomorrow }));

            const tasks = unwrap(await getTasks(testUserId, undefined, "today"));
            expect(tasks).toHaveLength(1);
            expect(tasks[0].id).toBe(task.id);
        });

        it("should include week precision tasks in today filter", async () => {
            const today = new Date();
            const task = unwrap(await createTask({
                userId: testUserId,
                title: "Weekly Task",
                dueDate: today,
                dueDatePrecision: "week",
            }));
            const tasks = unwrap(await getTasks(testUserId, undefined, "today"));
            const found = tasks.find((t) => t.id === task.id);
            expect(found).toBeDefined();
        });
    });

    describe("Recurring Tasks", () => {
        it("should create next occurrence when completing recurring task", async () => {
            const task = unwrap(await createTask({
                userId: testUserId,
                title: "Recurring Task",
                isRecurring: true,
                recurringRule: "FREQ=DAILY"
            }));

            expect(isSuccess(await toggleTaskCompletion(task.id, testUserId, true))).toBe(true);

            const tasks = unwrap(await getTasks(testUserId, undefined, "all"));
            // Should have original completed task AND new task
            expect(tasks).toHaveLength(2);
            const newTask = tasks.find(t => t.id !== task.id);
            expect(newTask).toBeDefined();
            expect(newTask?.title).toBe("Recurring Task");
            expect(newTask?.isCompleted).toBe(false);
        });
    });

    describe("Achievements", () => {
        it("should unlock achievement", async () => {
            // Mock achievements in DB
            const { sqliteConnection } = await import("@/db");
            sqliteConnection.run(`INSERT INTO achievements (id, name, description, icon, condition_type, condition_value, xp_reward) VALUES ('first_task', 'First Task', 'Complete your first task', '🏆', 'count_total', 1, 50)`);

            const task = unwrap(await createTask({ userId: testUserId, title: "Achievement Task" }));
            expect(isSuccess(await toggleTaskCompletion(task.id, testUserId, true))).toBe(true);

            const userAchievementsList = await getUserAchievements(testUserId);
            expect(userAchievementsList.length).toBeGreaterThan(0);
            expect(userAchievementsList.find(ua => ua.achievementId === "first_task")).toBeDefined();
        });
    });

    describe("Lists", () => {
        it("should create and get lists", async () => {
            const listResult = await createList({ userId: testUserId, name: "My List", slug: "my-list" });
            expect(isSuccess(listResult)).toBe(true);
            if (!isSuccess(listResult)) return;
            const list = listResult.data;
            expect(list).toBeDefined();
            expect(list.name).toBe("My List");

            const lists = await getLists(testUserId);
            expect(lists).toHaveLength(1);
            expect(lists[0].id).toBe(list.id);
        });

        it("should update a list", async () => {
            const listResult = await createList({ userId: testUserId, name: "Old Name", slug: "old-name" });
            expect(isSuccess(listResult)).toBe(true);
            if (!isSuccess(listResult)) return;
            const list = listResult.data;
            await updateList(list.id, testUserId, { name: "New Name" });
            const updated = await getList(list.id, testUserId);
            expect(updated.name).toBe("New Name");
        });

        it("should delete a list", async () => {
            const listResult = await createList({ userId: testUserId, name: "To Delete", slug: "to-delete" });
            expect(isSuccess(listResult)).toBe(true);
            if (!isSuccess(listResult)) return;
            const list = listResult.data;
            await deleteList(list.id, testUserId);
            const deleted = await getList(list.id, testUserId);
            expect(deleted).toBeUndefined();
        });
    });

    describe("Labels", () => {
        it("should create and get labels", async () => {
            await createLabel({ userId: testUserId, name: "Work", color: "red" });
            const labelsList = await getLabels(testUserId);
            expect(labelsList).toHaveLength(1);
            expect(labelsList[0].name).toBe("Work");
        });

        it("should update a label", async () => {
            await createLabel({ userId: testUserId, name: "Old Label", color: "blue" });
            const labelsList = await getLabels(testUserId);
            const label = labelsList[0];
            await updateLabel(label.id, testUserId, { name: "New Label" });
            const updated = await getLabel(label.id, testUserId);
            expect(updated.name).toBe("New Label");
        });

        it("should delete a label", async () => {
            await createLabel({ userId: testUserId, name: "Delete Label", color: "green" });
            const labelsList = await getLabels(testUserId);
            const label = labelsList[0];
            await deleteLabel(label.id, testUserId);
            const deleted = await getLabel(label.id, testUserId);
            expect(deleted).toBeUndefined();
        });
    });

    describe("Subtasks", () => {
        it("should create and get subtasks", async () => {
            const parent = unwrap(await createTask({ userId: testUserId, title: "Parent Task" }));
            const subtask = unwrap(await createSubtask(parent.id, testUserId, "Subtask 1"));
            expect(subtask.parentId).toBe(parent.id);

            const subtasksResult = await getSubtasks(parent.id, testUserId);
            expect(isSuccess(subtasksResult)).toBe(true);
            if (!isSuccess(subtasksResult)) return;
            expect(subtasksResult.data).toHaveLength(1);
            expect(subtasksResult.data[0].title).toBe("Subtask 1");
        });

        it("should update subtask", async () => {
            const parent = unwrap(await createTask({ userId: testUserId, title: "Parent Task" }));
            const subtask = unwrap(await createSubtask(parent.id, testUserId, "Subtask"));
            expect(isSuccess(await updateSubtask(subtask.id, testUserId, true))).toBe(true);
            const updatedResult = await getTask(subtask.id, testUserId);
            expect(isSuccess(updatedResult)).toBe(true);
            if (!isSuccess(updatedResult)) return;
            expect(updatedResult.data?.isCompleted).toBe(true);
        });

        it("should delete subtask", async () => {
            const parent = unwrap(await createTask({ userId: testUserId, title: "Parent Task" }));
            const subtask = unwrap(await createSubtask(parent.id, testUserId, "Subtask"));
            expect(isSuccess(await deleteSubtask(subtask.id, testUserId))).toBe(true);
            const deletedResult = await getTask(subtask.id, testUserId);
            expect(isSuccess(deletedResult)).toBe(true);
            if (!isSuccess(deletedResult)) return;
            expect(deletedResult.data).toBeNull();
        });
    });

    describe("Dependencies", () => {
        it("should add and remove dependencies", async () => {
            const task1 = unwrap(await createTask({ userId: testUserId, title: "Task 1" }));
            const task2 = unwrap(await createTask({ userId: testUserId, title: "Task 2" }));

            await addDependency(testUserId, task1.id, task2.id); // Task 1 blocked by Task 2

            const blockers = await getBlockers(testUserId, task1.id);
            expect(blockers).toHaveLength(1);
            expect(blockers[0].id).toBe(task2.id);

            const blocked = await getBlockedTasks(testUserId, task2.id);
            expect(blocked).toHaveLength(1);
            expect(blocked[0].id).toBe(task1.id);

            await removeDependency(testUserId, task1.id, task2.id);
            const blockersAfter = await getBlockers(testUserId, task1.id);
            expect(blockersAfter).toHaveLength(0);
        });

        it("should prevent circular dependency", async () => {
            const task1 = unwrap(await createTask({ userId: testUserId, title: "Task 1" }));
            const task2 = unwrap(await createTask({ userId: testUserId, title: "Task 2" }));

            const firstResult = await addDependency(testUserId, task1.id, task2.id);
            expect(isSuccess(firstResult)).toBe(true);

            // Try to make Task 2 blocked by Task 1 (cycle)
            const result = await addDependency(testUserId, task2.id, task1.id);
            expect(isSuccess(result)).toBe(false);
            if (!isSuccess(result)) {
                expect(result.error.code).toBe("VALIDATION_ERROR");
                expect(result.error.details?.blockerId).toContain("circular");
            }
        });

        it("should prevent self dependency", async () => {
            const task = unwrap(await createTask({ userId: testUserId, title: "Task" }));
            const result = await addDependency(testUserId, task.id, task.id);
            expect(isSuccess(result)).toBe(false);
            if (!isSuccess(result)) {
                expect(result.error.code).toBe("VALIDATION_ERROR");
                expect(result.error.details?.blockerId).toContain("own blocker");
            }
        });

        it("should log unblocked status correctly for multiple blocked tasks", async () => {
            // Task A blocks Task B and Task C
            const blocker = unwrap(await createTask({ userId: testUserId, title: "Blocker" }));
            const blocked1 = unwrap(await createTask({ userId: testUserId, title: "Blocked 1" }));
            const blocked2 = unwrap(await createTask({ userId: testUserId, title: "Blocked 2" }));

            await addDependency(testUserId, blocked1.id, blocker.id);
            await addDependency(testUserId, blocked2.id, blocker.id);

            // Complete the blocker
            expect(isSuccess(await toggleTaskCompletion(blocker.id, testUserId, true))).toBe(true);

            // Check logs
            const logs1 = await getTaskLogs(blocked1.id);
            const logs2 = await getTaskLogs(blocked2.id);

            // Both should say "Task is now unblocked!"
            expect(logs1[0].details).toContain("Task is now unblocked!");
            expect(logs2[0].details).toContain("Task is now unblocked!");
        });

        it("should handle partial unblocking", async () => {
            // Task Target blocked by Blocker A and Blocker B
            const target = unwrap(await createTask({ userId: testUserId, title: "Target" }));
            const blockerA = unwrap(await createTask({ userId: testUserId, title: "Blocker A" }));
            const blockerB = unwrap(await createTask({ userId: testUserId, title: "Blocker B" }));

            await addDependency(testUserId, target.id, blockerA.id);
            await addDependency(testUserId, target.id, blockerB.id);

            // Complete Blocker A first
            expect(isSuccess(await toggleTaskCompletion(blockerA.id, testUserId, true))).toBe(true);
            const logsAfterA = await getTaskLogs(target.id);
            // Should verify it is NOT unblocked yet
            expect(logsAfterA[0].details).toContain("Blocker \"Blocker A\" completed");
            expect(logsAfterA[0].details).not.toContain("Task is now unblocked!");

            // Complete Blocker B
            expect(isSuccess(await toggleTaskCompletion(blockerB.id, testUserId, true))).toBe(true);
            const logsAfterB = await getTaskLogs(target.id);
            // NOW it should be unblocked
            expect(logsAfterB[0].details).toContain("Task is now unblocked!");
        });

        it("should not get blockers for task owned by another user", async () => {
            // Create task for another user directly in DB
            const otherUserId = "other_user_" + Math.random();
            // We don't need to create the user in DB for this test, just the task
            // But if foreign key constraints exist, we might need the user.
            // tasks.userId usually doesn't have FK constraint in simple schemas or SQLite?
            // Let's assume we need the user.
            await createTestUser(otherUserId, "other@example.com");

            const [otherTask] = await db.insert(tasks).values({
                userId: otherUserId,
                title: "Other Task",
                position: 0,
                listId: null
            }).returning();

            // Run in auth context of the test user to ensure isolation
            // Try to get blockers for otherTask
            const blockers = await getBlockers(testUserId, otherTask.id);
            expect(blockers).toHaveLength(0);
        });
    });

    describe("Templates", () => {
        it("should create and instantiate template", async () => {
            const content = JSON.stringify({
                title: "Template Task",
                subtasks: [{ title: "Subtask" }]
            });
            await createTemplate(testUserId, "My Template", content);

            const templatesList = await getTemplates(testUserId);
            expect(templatesList).toHaveLength(1);
            expect(templatesList[0].name).toBe("My Template");

            await instantiateTemplate(testUserId, templatesList[0].id);
            const tasks = unwrap(await getTasks(testUserId, undefined, "all"));
            // Should have only 1 parent task (subtasks are now nested)
            const templateTask = tasks.find(t => t.title === "Template Task");
            expect(templateTask).toBeDefined();
            // Verify subtasks are attached to parent
            expect(templateTask?.subtaskCount).toBe(1);
            expect(templateTask?.subtasks?.[0]?.title).toBe("Subtask");
        });

        it("should delete template", async () => {
            await createTemplate(testUserId, "Temp", "{}");
            const templatesList = await getTemplates(testUserId);
            await deleteTemplate(templatesList[0].id, testUserId);
            const remaining = await getTemplates(testUserId);
            expect(remaining).toHaveLength(0);
        });

        it("should update template name and content", async () => {
            const originalContent = JSON.stringify({ title: "Original Task" });
            await createTemplate(testUserId, "Original Name", originalContent);
            const templatesList = await getTemplates(testUserId);
            const template = templatesList[0];

            const newContent = JSON.stringify({ title: "Updated Task", priority: "high" });
            const result = await updateTemplate(template.id, testUserId, "Updated Name", newContent);
            expect(isSuccess(result)).toBe(true);

            const updatedList = await getTemplates(testUserId);
            expect(updatedList).toHaveLength(1);
            expect(updatedList[0].name).toBe("Updated Name");
            expect(updatedList[0].content).toBe(newContent);
        });

        it("should fail to update template with empty name", async () => {
            await createTemplate(testUserId, "Test Template", "{}");
            const templatesList = await getTemplates(testUserId);
            const template = templatesList[0];

            const result = await updateTemplate(template.id, testUserId, "", "{}");
            expect(isSuccess(result)).toBe(false);
            if (!isSuccess(result)) {
                expect(result.error.code).toBe("VALIDATION_ERROR");
            }
        });

        it("should fail to update non-existent template", async () => {
            const result = await updateTemplate(99999, testUserId, "Name", "{}");
            expect(isSuccess(result)).toBe(false);
            if (!isSuccess(result)) {
                expect(result.error.code).toBe("NOT_FOUND");
            }
        });

        it("should not update template owned by another user", async () => {
            await createTemplate(testUserId, "My Template", "{}");
            const templatesList = await getTemplates(testUserId);
            const template = templatesList[0];

            // Try to update with a different user ID
            const result = await updateTemplate(template.id, "other-user-id", "Hacked Name", "{}");
            expect(isSuccess(result)).toBe(false);
            if (!isSuccess(result)) {
                // Now throws FORBIDDEN because requireUser checks if authenticated user matches passed userId
                expect(["NOT_FOUND", "FORBIDDEN"]).toContain(result.error.code);
            }

            // Verify original template is unchanged
            const unchanged = await getTemplates(testUserId);
            expect(unchanged[0].name).toBe("My Template");
        });
    });

    describe("Gamification", () => {
        it("should add XP and update stats", async () => {
            const result = await addXP(testUserId, 100);
            expect(result.newXP).toBe(100);

            const stats = await getUserStats(testUserId);
            expect(stats.xp).toBe(100);
        });
    });

    describe("Search", () => {
        it("should search tasks", async () => {
            unwrap(await createTask({ userId: testUserId, title: "Apple Pie" }));
            unwrap(await createTask({ userId: testUserId, title: "Banana Bread" }));

            const result = await searchTasks(testUserId, "Apple");
            expect(isSuccess(result)).toBe(true);
            if (!isSuccess(result)) return;
            expect(result.data).toHaveLength(1);
            expect(result.data[0].title).toBe("Apple Pie");
        });
    });

    describe("Reminders", () => {
        it("should create and get reminders", async () => {
            const task = unwrap(await createTask({ userId: testUserId, title: "Reminder Task" }));
            const remindAt = new Date();
            remindAt.setMilliseconds(0);
            await createReminder(testUserId, task.id, remindAt);
            const remindersList = await getReminders(task.id, testUserId);
            expect(remindersList.length).toBe(1);
            expect(remindersList[0].remindAt.getTime()).toBe(remindAt.getTime());
        });
    });

    describe("Logs", () => {
        it("should log task creation", async () => {
            const task = unwrap(await createTask({ userId: testUserId, title: "Logged Task" }));
            const logs = await getTaskLogs(task.id);
            expect(logs.length).toBeGreaterThan(0);
            expect(logs[0].action).toBe("created");
        });

        it("should get activity log", async () => {
            const task = unwrap(await createTask({ userId: testUserId, title: "Activity Log Task" }));
            await toggleTaskCompletion(task.id, testUserId, true);
            const activityLog = await getActivityLog(testUserId);
            expect(activityLog.length).toBeGreaterThan(0);
            // Should have both creation and completion logs
            const actions = activityLog.map(l => l.action);
            expect(actions).toContain("created");
            expect(actions).toContain("completed");
        });

        it("should fail to get task logs for another user's task", async () => {
            const task = unwrap(await createTask({ userId: testUserId, title: "Secret Task" }));

            // Switch to another user
            setMockAuthUser({ id: "other_user", email: "other@example.com" });

            const logs = await getTaskLogs(task.id);
            expect(logs).toHaveLength(0);

            // Reset user
            setMockAuthUser({ id: testUserId, email: `${testUserId}@example.com` });
        });

        it("should fail to get activity log for another user", async () => {
             try {
                await getActivityLog("other_user");
                expect(true).toBe(false); // Should not reach here
             } catch (error) {
                 if (error instanceof Error) {
                     expect(error.message).toMatch(/Forbidden|authorized/i);
                     expect(error.name).toBe("ForbiddenError");
                 } else {
                     throw error;
                 }
             }
        });
    });

    describe("View Settings", () => {
        it("should save and get view settings", async () => {
            await saveViewSettings(testUserId, "inbox", {
                layout: "board",
                showCompleted: false,
                groupBy: "priority",
            });

            const settings = await getViewSettings(testUserId, "inbox");
            expect(settings).toBeDefined();
            expect(settings?.layout).toBe("board");
            expect(settings?.showCompleted).toBe(false);
            expect(settings?.groupBy).toBe("priority");
        });

        it("should update existing view settings", async () => {
            await saveViewSettings(testUserId, "today", { layout: "list" });
            await saveViewSettings(testUserId, "today", { layout: "calendar" });

            const settings = await getViewSettings(testUserId, "today");
            expect(settings?.layout).toBe("calendar");
        });

        it("should reset view settings", async () => {
            await saveViewSettings(testUserId, "upcoming", { layout: "board" });
            await resetViewSettings(testUserId, "upcoming");

            const settings = await getViewSettings(testUserId, "upcoming");
            expect(settings).toBeNull();
        });

        it("should return null for non-existent view settings", async () => {
            const settings = await getViewSettings(testUserId, "non-existent-view");
            expect(settings).toBeNull();
        });
    });

    describe("Reminders", () => {
        it("should delete a reminder", async () => {
            const task = unwrap(await createTask({ userId: testUserId, title: "Reminder Delete Task" }));
            const remindAt = new Date();
            await createReminder(testUserId, task.id, remindAt);

            const remindersBefore = await getReminders(task.id, testUserId);
            expect(remindersBefore.length).toBe(1);

            await deleteReminder(testUserId, remindersBefore[0].id);

            const remindersAfter = await getReminders(task.id, testUserId);
            expect(remindersAfter.length).toBe(0);
        });
    });

    describe("Todoist", () => {
        it("should allow token rotation in test mode", async () => {
            const result = await rotateTodoistTokens();
            expect(result.success).toBe(true);
        });

        it("should rotate refresh token when present", async () => {
            const previousEnv = process.env.NODE_ENV;
            const previousKey = process.env.TODOIST_ENCRYPTION_KEY;
            const previousKeys = process.env.TODOIST_ENCRYPTION_KEYS;
            const previousEncryptedKey = process.env.TODOIST_ENCRYPTION_KEY_ENCRYPTED;
            const previousEncryptedKeys = process.env.TODOIST_ENCRYPTION_KEYS_ENCRYPTED;

            process.env.NODE_ENV = "development";
            process.env.TODOIST_ENCRYPTION_KEY = "a".repeat(64);
            process.env.TODOIST_ENCRYPTION_KEYS = "";
            process.env.TODOIST_ENCRYPTION_KEY_ENCRYPTED = "";
            process.env.TODOIST_ENCRYPTION_KEYS_ENCRYPTED = "";
            resetTodoistKeyRingForTests();

            const accessPayload = await encryptToken("access-token");
            const refreshPayload = await encryptToken("refresh-token");

            await db.insert(externalIntegrations).values({
                userId: testUserId,
                provider: "todoist",
                accessTokenEncrypted: accessPayload.ciphertext,
                accessTokenIv: accessPayload.iv,
                accessTokenTag: accessPayload.tag,
                accessTokenKeyId: accessPayload.keyId ?? "default",
                refreshTokenEncrypted: refreshPayload.ciphertext,
                refreshTokenIv: refreshPayload.iv,
                refreshTokenTag: refreshPayload.tag,
            });

            try {
                const result = await rotateTodoistTokens();
                expect(result.success).toBe(true);

                const updated = await db.query.externalIntegrations.findFirst({
                    where: and(
                        eq(externalIntegrations.userId, testUserId),
                        eq(externalIntegrations.provider, "todoist")
                    ),
                });

                expect(updated).toBeDefined();
                expect(updated?.accessTokenEncrypted).not.toBe(accessPayload.ciphertext);
                expect(updated?.refreshTokenEncrypted).not.toBe(refreshPayload.ciphertext);
                expect(updated?.refreshTokenIv).not.toBe(refreshPayload.iv);
                expect(updated?.refreshTokenTag).not.toBe(refreshPayload.tag);
            } finally {
                process.env.NODE_ENV = previousEnv;
                process.env.TODOIST_ENCRYPTION_KEY = previousKey;
                process.env.TODOIST_ENCRYPTION_KEYS = previousKeys;
                process.env.TODOIST_ENCRYPTION_KEY_ENCRYPTED = previousEncryptedKey;
                process.env.TODOIST_ENCRYPTION_KEYS_ENCRYPTED = previousEncryptedKeys;
                resetTodoistKeyRingForTests();
            }
        });
    });
});
