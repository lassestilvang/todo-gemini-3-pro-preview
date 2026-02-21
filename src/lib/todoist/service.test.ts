import { describe, expect, it, mock } from "bun:test";

describe("todoist service snapshot", () => {
    it("merges active and recently completed tasks since last sync", async () => {
        // Some integration tests mock this module; restore and import a unique specifier
        // to ensure this test executes the real implementation.
        mock.restore();
        const { fetchTodoistSnapshot } = await import(`./service?real=${Date.now()}`);

        const getCompletedTasksByCompletionDate = mock()
            .mockResolvedValueOnce({
                items: [{ id: "done_1", content: "Done 1", projectId: "p1", checked: true }],
                nextCursor: "next_cursor",
            })
            .mockResolvedValueOnce({
                items: [{ id: "done_2", content: "Done 2", projectId: "p1", checked: true }],
                nextCursor: null,
            });

        const client = {
            getProjects: mock(async () => ({ results: [{ id: "p1", name: "Project 1" }] })),
            getLabels: mock(async () => ({ results: [{ id: "l1", name: "test" }] })),
            getTasks: mock(async () => ({
                results: [{ id: "active_1", content: "Active 1", projectId: "p1", checked: false }],
            })),
            getCompletedTasksByCompletionDate,
        };

        const lastSyncedAt = new Date("2026-02-20T08:00:00.000Z");
        const snapshot = await fetchTodoistSnapshot(client as never, { lastSyncedAt });

        expect(snapshot.projects.map((project) => project.id)).toEqual(["p1"]);
        expect(snapshot.labels.map((label) => label.id)).toEqual(["l1"]);
        expect(snapshot.tasks.map((task) => task.id).sort()).toEqual(["active_1", "done_1", "done_2"]);
        expect(getCompletedTasksByCompletionDate).toHaveBeenCalledTimes(2);
        expect(getCompletedTasksByCompletionDate.mock.calls[0]?.[0]?.since).toBe("2026-02-20T08:00:00.000Z");
    });
});
