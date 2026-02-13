import { describe, expect, it } from "bun:test";
import { mapGoogleTaskToLocal, mapLocalTaskToGoogle } from "./mapper";

describe("google tasks mapper", () => {
    it("maps google task to local fields", () => {
        const task = mapGoogleTaskToLocal(
            {
                id: "gt-1",
                title: "Remote",
                notes: "Notes",
                status: "completed",
                due: "2026-02-11T00:00:00.000Z",
                completed: "2026-02-12T10:00:00.000Z",
            },
            5
        );

        expect(task.title).toBe("Remote");
        expect(task.description).toBe("Notes");
        expect(task.isCompleted).toBe(true);
        expect(task.listId).toBe(5);
        expect(task.dueDate?.toISOString()).toBe("2026-02-11T00:00:00.000Z");
    });

    it("maps local task to google payload", () => {
        const payload = mapLocalTaskToGoogle({
            id: 2,
            userId: "user",
            title: "Local",
            description: "Desc",
            listId: 2,
            dueDate: new Date("2026-02-11T15:30:00.000Z"),
            priority: "medium",
            isCompleted: false,
            position: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        } as never);

        expect(payload.title).toBe("Local");
        expect(payload.notes).toBe("Desc");
        expect(payload.status).toBe("needsAction");
        expect(payload.due).toBe("2026-02-11T15:30:00.000Z");
    });
});
