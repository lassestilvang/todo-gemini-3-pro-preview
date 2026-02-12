import type { GoogleTask, GoogleTasklist, GoogleTasklistListResponse, GoogleTasksListResponse } from "./types";

type RequestOptions = {
    method?: string;
    path: string;
    query?: Record<string, string | number | boolean | undefined>;
    body?: unknown;
};

export class GoogleTasksClient {
    private token: string;
    private baseUrl = "https://tasks.googleapis.com/tasks/v1";

    constructor(token: string) {
        this.token = token;
    }

    private async request<T>(options: RequestOptions): Promise<T> {
        const url = new URL(`${this.baseUrl}${options.path}`);
        if (options.query) {
            for (const [key, value] of Object.entries(options.query)) {
                if (value === undefined) continue;
                url.searchParams.set(key, String(value));
            }
        }

        const response = await fetch(url.toString(), {
            method: options.method ?? "GET",
            headers: {
                Authorization: `Bearer ${this.token}`,
                "Content-Type": "application/json",
            },
            body: options.body ? JSON.stringify(options.body) : undefined,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Google Tasks API error: ${response.status} ${errorText}`);
        }

        if (response.status === 204) {
            return undefined as T;
        }

        return (await response.json()) as T;
    }

    async listTasklists(): Promise<GoogleTasklist[]> {
        const items: GoogleTasklist[] = [];
        let pageToken: string | undefined;
        do {
            const response = await this.request<GoogleTasklistListResponse>({
                path: "/users/@me/lists",
                query: { maxResults: 100, pageToken },
            });
            if (response.items) {
                items.push(...response.items);
            }
            pageToken = response.nextPageToken;
        } while (pageToken);
        return items;
    }

    async listTasks(tasklistId: string, updatedMin?: string): Promise<GoogleTask[]> {
        const items: GoogleTask[] = [];
        let pageToken: string | undefined;
        do {
            const response = await this.request<GoogleTasksListResponse>({
                path: `/lists/${tasklistId}/tasks`,
                query: {
                    maxResults: 100,
                    showCompleted: true,
                    showDeleted: true,
                    showHidden: true,
                    updatedMin,
                    pageToken,
                },
            });
            if (response.items) {
                items.push(...response.items);
            }
            pageToken = response.nextPageToken;
        } while (pageToken);
        return items;
    }

    async getTask(tasklistId: string, taskId: string): Promise<GoogleTask> {
        return this.request<GoogleTask>({
            path: `/lists/${tasklistId}/tasks/${taskId}`,
        });
    }

    async createTasklist(payload: { title: string }): Promise<GoogleTasklist> {
        return this.request<GoogleTasklist>({
            path: "/users/@me/lists",
            method: "POST",
            body: payload,
        });
    }

    async updateTasklist(tasklistId: string, payload: { title: string }): Promise<GoogleTasklist> {
        return this.request<GoogleTasklist>({
            path: `/users/@me/lists/${tasklistId}`,
            method: "PATCH",
            body: payload,
        });
    }

    async deleteTasklist(tasklistId: string): Promise<void> {
        await this.request<void>({
            path: `/users/@me/lists/${tasklistId}`,
            method: "DELETE",
        });
    }

    async createTask(tasklistId: string, payload: Partial<GoogleTask>): Promise<GoogleTask> {
        return this.request<GoogleTask>({
            path: `/lists/${tasklistId}/tasks`,
            method: "POST",
            body: payload,
        });
    }

    async updateTask(tasklistId: string, taskId: string, payload: Partial<GoogleTask>): Promise<GoogleTask> {
        return this.request<GoogleTask>({
            path: `/lists/${tasklistId}/tasks/${taskId}`,
            method: "PATCH",
            body: payload,
        });
    }

    async deleteTask(tasklistId: string, taskId: string): Promise<void> {
        await this.request<void>({
            path: `/lists/${tasklistId}/tasks/${taskId}`,
            method: "DELETE",
        });
    }

    async moveTask(tasklistId: string, taskId: string, params: { parent?: string; previous?: string }): Promise<void> {
        await this.request<void>({
            path: `/lists/${tasklistId}/tasks/${taskId}/move`,
            method: "POST",
            query: {
                parent: params.parent,
                previous: params.previous,
            },
        });
    }

    async clearCompleted(tasklistId: string): Promise<void> {
        await this.request<void>({
            path: `/lists/${tasklistId}/clear`,
            method: "POST",
        });
    }
}
