const TODOIST_API_BASE = "https://api.todoist.com/rest/v2";

type RequestOptions = {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
    token: string;
};

export class TodoistClient {
    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    private async request<T>(path: string, { method = "GET", body, token }: RequestOptions): Promise<T> {
        const response = await fetch(`${TODOIST_API_BASE}${path}`, {
            method,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Todoist API error (${response.status}): ${errorText}`);
        }

        if (response.status === 204) {
            return null as T;
        }

        return (await response.json()) as T;
    }

    getProjects() {
        return this.request("/projects", { token: this.token });
    }

    getLabels() {
        return this.request("/labels", { token: this.token });
    }

    getTasks() {
        return this.request("/tasks", { token: this.token });
    }

    createTask(payload: unknown) {
        return this.request("/tasks", { method: "POST", body: payload, token: this.token });
    }

    updateTask(taskId: string, payload: unknown) {
        return this.request(`/tasks/${taskId}`, { method: "POST", body: payload, token: this.token });
    }

    closeTask(taskId: string) {
        return this.request(`/tasks/${taskId}/close`, { method: "POST", token: this.token });
    }

    reopenTask(taskId: string) {
        return this.request(`/tasks/${taskId}/reopen`, { method: "POST", token: this.token });
    }

    deleteTask(taskId: string) {
        return this.request(`/tasks/${taskId}`, { method: "DELETE", token: this.token });
    }
}
