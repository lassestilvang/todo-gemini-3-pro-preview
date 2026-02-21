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
                projectId: "p1",
                addedAt: "2026-02-01T08:00:00.000Z",
                due: {
                    date: "2026-02-11",
                    datetime: "2026-02-11T15:45:00.000Z",
                    isRecurring: false,
                    string: "",
                },
                deadline: { date: "2026-02-13", lang: "en" },
                duration: { amount: 30, unit: "minute" },
                checked: true,
                priority: 4,
                completedAt: "2026-02-11T12:30:00.000Z",
            } as never,
            mappings
        );

        expect(task.title).toBe("Hello");
        expect(task.description).toBe("World");
        expect(task.listId).toBe(1);
        expect(task.isCompleted).toBe(true);
        expect(task.priority).toBe("high");
        expect(task.completedAt).toBeInstanceOf(Date);
        expect(task.createdAt).toEqual(new Date("2026-02-01T08:00:00.000Z"));
        expect(task.deadline).toEqual(new Date("2026-02-13T00:00:00.000Z"));
        expect(task.estimateMinutes).toBe(30);
        expect(task.dueDatePrecision).toBeNull();
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
                deadline: new Date("2026-02-13T00:00:00.000Z"),
                estimateMinutes: 45,
                priority: "high",
                isCompleted: false,
                position: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as never,
            mappings
        );

        expect(payload.projectId).toBe("p1");
        expect(payload.dueDate).toBe("2026-02-11");
        expect(payload.priority).toBe(4);
        expect(payload.deadlineDate).toBe("2026-02-13");
        expect(payload.duration).toBe(45);
        expect(payload.durationUnit).toBe("minute");
    });

    it("does not send empty labels payload when no label mapping exists", () => {
        const payload = mapLocalTaskToTodoist(
            {
                id: 2,
                userId: "user",
                title: "Unmapped labels",
                description: null,
                listId: 999,
                dueDate: null,
                priority: "none",
                isCompleted: false,
                position: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as never,
            mappings,
            {
                labelIds: [123],
                labelIdToExternal: new Map<number, string>(),
            }
        );

        expect(payload.labels).toBeUndefined();
    });

    it("keeps list-mapped label when explicit mapped task labels are present", () => {
        const payload = mapLocalTaskToTodoist(
            {
                id: 3,
                userId: "user",
                title: "Scoped task",
                description: null,
                listId: 2,
                dueDate: null,
                priority: "none",
                isCompleted: false,
                position: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as never,
            mappings,
            {
                labelIds: [123],
                labelIdToExternal: new Map<number, string>([[123, "custom_label"]]),
            }
        );

        expect(payload.labels?.slice().sort()).toEqual(["custom_label", "l1"]);
    });

    it("translates mapped external label ids to Todoist label names when available", () => {
        const payload = mapLocalTaskToTodoist(
            {
                id: 4,
                userId: "user",
                title: "Named labels",
                description: null,
                listId: 2,
                dueDate: null,
                priority: "none",
                isCompleted: false,
                position: 0,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as never,
            mappings,
            {
                labelIds: [123],
                labelIdToExternal: new Map<number, string>([[123, "custom_label"]]),
                externalLabelToName: new Map<string, string>([
                    ["l1", "test"],
                    ["custom_label", "urgent"],
                ]),
            }
        );

        expect(payload.labels?.slice().sort()).toEqual(["test", "urgent"]);
    });
});
