import { describe, expect, it } from "bun:test";
import { mapLocalTaskToTodoist, mapTodoistTaskToLocal } from "./mapper";

const mappings = {
    projects: [{ projectId: "p1", listId: 1 }],
    labels: [{ labelId: "l1", listId: 2 }],
};

describe("todoist mapper", () => {
    it("maps todoist task to local fields", () => {
        const task = mapTodoistTaskToLocal(
            {
                id: "t1",
                content: "Hello",
                description: "World",
                project_id: "p1",
                due: { date: "2026-02-11" },
                is_completed: true,
            },
            mappings
        );

        expect(task.title).toBe("Hello");
        expect(task.description).toBe("World");
        expect(task.listId).toBe(1);
        expect(task.isCompleted).toBe(true);
    });

    it("maps local task to todoist payload", () => {
        const payload = mapLocalTaskToTodoist(
            {
                id: 1,
                userId: "user",
                title: "Local",
                description: "Desc",
                listId: 1,
                dueDate: new Date("2026-02-11T00:00:00.000Z"),
                priority: "high",
                isCompleted: false,
                position: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as never,
            mappings
        );

        expect(payload.project_id).toBe("p1");
        expect(payload.due_date).toBe("2026-02-11");
        expect(payload.priority).toBe(4);
    });
});
