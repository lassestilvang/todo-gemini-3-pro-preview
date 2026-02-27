import { beforeEach, afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import { TodoistApi } from "@doist/todoist-api-typescript";
import { TodoistClient } from "./client";

const apiState = {
    getProjects: mock(async () => ({ results: [], nextCursor: null })),
};

describe("TodoistClient retry handling", () => {
    beforeEach(() => {
        apiState.getProjects = mock(async () => ({ results: [], nextCursor: null }));
        
        // Mock TodoistApi prototype methods
        spyOn(TodoistApi.prototype, "getProjects").mockImplementation((args) => apiState.getProjects(args));
        spyOn(TodoistApi.prototype, "getLabels").mockResolvedValue({ results: [], nextCursor: null } as unknown);
        spyOn(TodoistApi.prototype, "getTasks").mockResolvedValue({ results: [], nextCursor: null } as unknown);
        spyOn(TodoistApi.prototype, "getCompletedTasksByCompletionDate").mockResolvedValue({ items: [], nextCursor: null } as unknown);
        spyOn(TodoistApi.prototype, "addTask").mockResolvedValue({} as unknown);
        spyOn(TodoistApi.prototype, "addLabel").mockResolvedValue({} as unknown);
        spyOn(TodoistApi.prototype, "updateLabel").mockResolvedValue({} as unknown);
        spyOn(TodoistApi.prototype, "updateTask").mockResolvedValue({} as unknown);
        spyOn(TodoistApi.prototype, "moveTask").mockResolvedValue({} as unknown);
        spyOn(TodoistApi.prototype, "closeTask").mockResolvedValue({} as unknown);
        spyOn(TodoistApi.prototype, "reopenTask").mockResolvedValue({} as unknown);
        spyOn(TodoistApi.prototype, "deleteTask").mockResolvedValue({} as unknown);
    });

    afterEach(() => {
        mock.restore();
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

        const client = new TodoistClient("token");

        await expect(client.getProjects()).rejects.toThrow("400");
        expect(apiState.getProjects).toHaveBeenCalledTimes(1);
    });
});
