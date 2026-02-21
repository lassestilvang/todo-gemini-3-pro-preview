import { beforeEach, describe, expect, it, mock } from "bun:test";

const apiState = {
    getProjects: mock(async () => ({ results: [], nextCursor: null })),
};

mock.module("@doist/todoist-api-typescript", () => ({
    TodoistApi: class {
        constructor(_token: string) { }

        getProjects(args?: unknown) {
            return apiState.getProjects(args);
        }

        getLabels() {
            return Promise.resolve({ results: [], nextCursor: null });
        }

        getTasks() {
            return Promise.resolve({ results: [], nextCursor: null });
        }

        getCompletedTasksByCompletionDate() {
            return Promise.resolve({ items: [], nextCursor: null });
        }

        addTask() {
            return Promise.resolve({});
        }

        addLabel() {
            return Promise.resolve({});
        }

        updateLabel() {
            return Promise.resolve({});
        }

        updateTask() {
            return Promise.resolve({});
        }

        moveTask() {
            return Promise.resolve({});
        }

        closeTask() {
            return Promise.resolve({});
        }

        reopenTask() {
            return Promise.resolve({});
        }

        deleteTask() {
            return Promise.resolve({});
        }
    },
}));

describe("TodoistClient retry handling", () => {
    beforeEach(() => {
        apiState.getProjects = mock(async () => ({ results: [], nextCursor: null }));
    });

    it("retries retryable failures and succeeds", async () => {
        const retryableError = Object.assign(new Error("429 Too Many Requests"), {
            status: 429,
            response: {
                headers: {
                    get: (key: string) => key.toLowerCase() === "retry-after" ? "0" : null,
                },
            },
        });
        apiState.getProjects = mock()
            .mockRejectedValueOnce(retryableError)
            .mockResolvedValueOnce({ results: [{ id: "p1" }], nextCursor: null });

        const { TodoistClient } = await import(`./client?case=retry-${Date.now()}`);
        const client = new TodoistClient("token");
        const response = await client.getProjects();

        expect(apiState.getProjects).toHaveBeenCalledTimes(2);
        expect(response.results[0].id).toBe("p1");
    });

    it("does not retry non-retryable failures", async () => {
        const badRequestError = Object.assign(new Error("400 Bad Request"), {
            status: 400,
        });
        apiState.getProjects = mock().mockRejectedValue(badRequestError);

        const { TodoistClient } = await import(`./client?case=no-retry-${Date.now()}`);
        const client = new TodoistClient("token");

        await expect(client.getProjects()).rejects.toThrow("400");
        expect(apiState.getProjects).toHaveBeenCalledTimes(1);
    });
});
