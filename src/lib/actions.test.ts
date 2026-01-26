import { describe, expect, it, beforeAll, mock, beforeEach } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
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
import { isSuccess } from "./action-result";

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

describe("Server Actions", () => {
    let testUserId: string;

    beforeAll(async () => {
        // Ensure tables exist for this test suite
        // The global setup may have been interrupted by parallel execution
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();
        // Create a test user for each test
        const user = await createTestUser("test_user_actions", "test@actions.com");
        testUserId = user.id;

        // Set the mock auth user so that requireUser() checks pass
        setMockAuthUser({
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            profilePictureUrl: null
        });
    });

    describe("Tasks", () => {
        it("should create a task", async () => {
            const task = await createTask({
                userId: testUserId,
                title: "Test Task",
                description: "This is a test task",
                priority: "high",
            });

            expect(task).toBeDefined();
            expect(task.title).toBe("Test Task");
            expect(task.id).toBeDefined();
        });

        it("should get tasks", async () => {
            const task = await createTask({ userId: testUserId, title: "Get Test Task" });
            const allTasks = await getTasks(testUserId, undefined, "all");
            expect(allTasks.length).toBeGreaterThan(0);
            const found = allTasks.find((t) => t.id === task.id);
            expect(found).toBeDefined();
        });

        it("should get a single task", async () => {
            const task = await createTask({ userId: testUserId, title: "Single Task" });
            const fetchedTask = await getTask(task.id, testUserId);
            expect(fetchedTask).toBeDefined();
            expect(fetchedTask?.id).toBe(task.id);
        });

        it("should update a task", async () => {
            const task = await createTask({ userId: testUserId, title: "Original Task" });
            await updateTask(task.id, testUserId, { title: "Updated Task" });
            const updated = await getTask(task.id, testUserId);
            expect(updated?.title).toBe("Updated Task");
        });

        it("should delete a task", async () => {
            const task = await createTask({ userId: testUserId, title: "Task to Delete" });
            await deleteTask(task.id, testUserId);
            const deleted = await getTask(task.id, testUserId);
            expect(deleted).toBeNull();
        });

        it("should create a task with deadline", async () => {
            const deadline = new Date();
            deadline.setMilliseconds(0);
            const task = await createTask({
                userId: testUserId,
                title: "Deadline Task",
                deadline
            });
            expect(task.deadline).toBeDefined();
            expect(task.deadline?.getTime()).toBe(deadline.getTime());
        });

        it("should toggle task completion", async () => {
            const task = await createTask({ userId: testUserId, title: "Task to Complete" });
            await toggleTaskCompletion(task.id, testUserId, true);
            const completed = await getTask(task.id, testUserId);
            expect(completed?.isCompleted).toBe(true);
            expect(completed?.completedAt).toBeDefined();

            await toggleTaskCompletion(task.id, testUserId, false);
            const uncompleted = await getTask(task.id, testUserId);
            expect(uncompleted?.isCompleted).toBe(false);
            expect(uncompleted?.completedAt).toBeNull();
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
            const task1 = await createTask({ userId: testUserId, title: "Task 1", listId: list1.id });
            await createTask({ userId: testUserId, title: "Task 2", listId: list2.id });

            const tasks = await getTasks(testUserId, list1.id);
            expect(tasks).toHaveLength(1);
            expect(tasks[0].id).toBe(task1.id);
        });

        it("should filter tasks by label", async () => {
            const labelResult = await createLabel({ userId: testUserId, name: "Label 1" });
            expect(isSuccess(labelResult)).toBe(true);
            if (!isSuccess(labelResult)) return;
            const label = labelResult.data;
            const task = await createTask({ userId: testUserId, title: "Task with Label", labelIds: [label.id] });
            await createTask({ userId: testUserId, title: "Task without Label" });

            const tasks = await getTasks(testUserId, undefined, "all", label.id);
            expect(tasks).toHaveLength(1);
            expect(tasks[0].id).toBe(task.id);
        });

        it("should filter tasks by date (today)", async () => {
            const today = new Date();
            const task = await createTask({ userId: testUserId, title: "Today Task", dueDate: today });
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            await createTask({ userId: testUserId, title: "Tomorrow Task", dueDate: tomorrow });

            const tasks = await getTasks(testUserId, undefined, "today");
            expect(tasks).toHaveLength(1);
            expect(tasks[0].id).toBe(task.id);
        });
    });

    describe("Recurring Tasks", () => {
        it("should create next occurrence when completing recurring task", async () => {
            const task = await createTask({
                userId: testUserId,
                title: "Recurring Task",
                isRecurring: true,
                recurringRule: "FREQ=DAILY"
            });

            await toggleTaskCompletion(task.id, testUserId, true);

            const tasks = await getTasks(testUserId, undefined, "all");
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

            const task = await createTask({ userId: testUserId, title: "Achievement Task" });
            await toggleTaskCompletion(task.id, testUserId, true);

            const userAchievementsList = await getUserAchievements(testUserId);
            expect(userAchievementsList).toHaveLength(1);
            expect(userAchievementsList[0].achievementId).toBe("first_task");
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
            const parent = await createTask({ userId: testUserId, title: "Parent Task" });
            const subtask = await createSubtask(parent.id, testUserId, "Subtask 1");
            expect(subtask.parentId).toBe(parent.id);

            const subtasks = await getSubtasks(parent.id, testUserId);
            expect(subtasks).toHaveLength(1);
            expect(subtasks[0].title).toBe("Subtask 1");
        });

        it("should update subtask", async () => {
            const parent = await createTask({ userId: testUserId, title: "Parent Task" });
            const subtask = await createSubtask(parent.id, testUserId, "Subtask");
            await updateSubtask(subtask.id, testUserId, true);
            const updated = await getTask(subtask.id, testUserId);
            expect(updated?.isCompleted).toBe(true);
        });

        it("should delete subtask", async () => {
            const parent = await createTask({ userId: testUserId, title: "Parent Task" });
            const subtask = await createSubtask(parent.id, testUserId, "Subtask");
            await deleteSubtask(subtask.id, testUserId);
            const deleted = await getTask(subtask.id, testUserId);
            expect(deleted).toBeNull();
        });
    });

    describe("Dependencies", () => {
        it("should add and remove dependencies", async () => {
            const task1 = await createTask({ userId: testUserId, title: "Task 1" });
            const task2 = await createTask({ userId: testUserId, title: "Task 2" });

            await addDependency(testUserId, task1.id, task2.id); // Task 1 blocked by Task 2

            const blockers = await getBlockers(task1.id);
            expect(blockers).toHaveLength(1);
            expect(blockers[0].id).toBe(task2.id);

            const blocked = await getBlockedTasks(task2.id);
            expect(blocked).toHaveLength(1);
            expect(blocked[0].id).toBe(task1.id);

            await removeDependency(testUserId, task1.id, task2.id);
            const blockersAfter = await getBlockers(task1.id);
            expect(blockersAfter).toHaveLength(0);
        });

        it("should prevent circular dependency", async () => {
            const task1 = await createTask({ userId: testUserId, title: "Task 1" });
            const task2 = await createTask({ userId: testUserId, title: "Task 2" });

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
            const task = await createTask({ userId: testUserId, title: "Task" });
            const result = await addDependency(testUserId, task.id, task.id);
            expect(isSuccess(result)).toBe(false);
            if (!isSuccess(result)) {
                expect(result.error.code).toBe("VALIDATION_ERROR");
                expect(result.error.details?.blockerId).toContain("own blocker");
            }
        });

        it("should log unblocked status correctly for multiple blocked tasks", async () => {
            // Task A blocks Task B and Task C
            const blocker = await createTask({ userId: testUserId, title: "Blocker" });
            const blocked1 = await createTask({ userId: testUserId, title: "Blocked 1" });
            const blocked2 = await createTask({ userId: testUserId, title: "Blocked 2" });

            await addDependency(testUserId, blocked1.id, blocker.id);
            await addDependency(testUserId, blocked2.id, blocker.id);

            // Complete the blocker
            await toggleTaskCompletion(blocker.id, testUserId, true);

            // Check logs
            const logs1 = await getTaskLogs(blocked1.id);
            const logs2 = await getTaskLogs(blocked2.id);

            // Both should say "Task is now unblocked!"
            expect(logs1[0].details).toContain("Task is now unblocked!");
            expect(logs2[0].details).toContain("Task is now unblocked!");
        });

        it("should handle partial unblocking", async () => {
            // Task Target blocked by Blocker A and Blocker B
            const target = await createTask({ userId: testUserId, title: "Target" });
            const blockerA = await createTask({ userId: testUserId, title: "Blocker A" });
            const blockerB = await createTask({ userId: testUserId, title: "Blocker B" });

            await addDependency(testUserId, target.id, blockerA.id);
            await addDependency(testUserId, target.id, blockerB.id);

            // Complete Blocker A first
            await toggleTaskCompletion(blockerA.id, testUserId, true);
            const logsAfterA = await getTaskLogs(target.id);
            // Should verify it is NOT unblocked yet
            expect(logsAfterA[0].details).toContain("Blocker \"Blocker A\" completed");
            expect(logsAfterA[0].details).not.toContain("Task is now unblocked!");

            // Complete Blocker B
            await toggleTaskCompletion(blockerB.id, testUserId, true);
            const logsAfterB = await getTaskLogs(target.id);
            // NOW it should be unblocked
            expect(logsAfterB[0].details).toContain("Task is now unblocked!");
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
            const tasks = await getTasks(testUserId, undefined, "all");
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
                expect(result.error.code).toBe("NOT_FOUND");
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
            await createTask({ userId: testUserId, title: "Apple Pie" });
            await createTask({ userId: testUserId, title: "Banana Bread" });

            const results = await searchTasks(testUserId, "Apple");
            expect(results).toHaveLength(1);
            expect(results[0].title).toBe("Apple Pie");
        });
    });

    describe("Reminders", () => {
        it("should create and get reminders", async () => {
            const task = await createTask({ userId: testUserId, title: "Reminder Task" });
            const remindAt = new Date();
            remindAt.setMilliseconds(0);
            await createReminder(testUserId, task.id, remindAt);
            const remindersList = await getReminders(task.id);
            expect(remindersList.length).toBe(1);
            expect(remindersList[0].remindAt.getTime()).toBe(remindAt.getTime());
        });
    });

    describe("Logs", () => {
        it("should log task creation", async () => {
            const task = await createTask({ userId: testUserId, title: "Logged Task" });
            const logs = await getTaskLogs(task.id);
            expect(logs.length).toBeGreaterThan(0);
            expect(logs[0].action).toBe("created");
        });

        it("should get activity log", async () => {
            const task = await createTask({ userId: testUserId, title: "Activity Log Task" });
            await toggleTaskCompletion(task.id, testUserId, true);
            const activityLog = await getActivityLog(testUserId);
            expect(activityLog.length).toBeGreaterThan(0);
            // Should have both creation and completion logs
            const actions = activityLog.map(l => l.action);
            expect(actions).toContain("created");
            expect(actions).toContain("completed");
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
            const task = await createTask({ userId: testUserId, title: "Reminder Delete Task" });
            const remindAt = new Date();
            await createReminder(testUserId, task.id, remindAt);

            const remindersBefore = await getReminders(task.id);
            expect(remindersBefore.length).toBe(1);

            await deleteReminder(testUserId, remindersBefore[0].id);

            const remindersAfter = await getReminders(task.id);
            expect(remindersAfter.length).toBe(0);
        });
    });
});
