import { TodoistApi } from "@doist/todoist-api-typescript";
import type {
    UpdateTaskArgs,
    AddTaskArgs,
    AddLabelArgs,
    UpdateLabelArgs,
    MoveTaskArgs,
    GetCompletedTasksByCompletionDateArgs,
    GetTasksArgs,
    GetProjectsArgs,
    GetLabelsArgs,
} from "@doist/todoist-api-typescript";

const MAX_RETRY_ATTEMPTS = 4;
const BASE_RETRY_DELAY_MS = 300;
const MAX_RETRY_DELAY_MS = 4000;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeBackoffMs(attempt: number) {
    const exp = Math.min(MAX_RETRY_DELAY_MS, BASE_RETRY_DELAY_MS * 2 ** (attempt - 1));
    const jitter = Math.random() * BASE_RETRY_DELAY_MS;
    return Math.round(exp + jitter);
}

function parseRetryAfterMs(value: string | null) {
    if (!value) {
        return null;
    }
    const seconds = Number(value);
    if (!Number.isNaN(seconds)) {
        return Math.max(0, seconds * 1000);
    }
    const dateMs = Date.parse(value);
    if (!Number.isNaN(dateMs)) {
        return Math.max(0, dateMs - Date.now());
    }
    return null;
}

export class TodoistClient {
    private api: TodoistApi;

    constructor(token: string) {
        this.api = new TodoistApi(token);
    }

    private getStatusCode(error: unknown) {
        if (typeof error !== "object" || error === null) {
            return null;
        }

        const candidate = error as {
            status?: number;
            code?: number | string;
            response?: { status?: number };
            responseData?: { status?: number };
            message?: string;
        };

        if (typeof candidate.status === "number") {
            return candidate.status;
        }
        if (typeof candidate.response?.status === "number") {
            return candidate.response.status;
        }
        if (typeof candidate.responseData?.status === "number") {
            return candidate.responseData.status;
        }
        if (typeof candidate.code === "number") {
            return candidate.code;
        }
        if (typeof candidate.code === "string") {
            const parsedCode = Number(candidate.code);
            if (!Number.isNaN(parsedCode)) {
                return parsedCode;
            }
        }
        if (typeof candidate.message === "string") {
            const statusMatch = candidate.message.match(/\b([1-5]\d{2})\b/);
            if (statusMatch) {
                return Number(statusMatch[1]);
            }
        }

        return null;
    }

    private getRetryAfterMs(error: unknown) {
        if (typeof error !== "object" || error === null) {
            return null;
        }

        const candidate = error as {
            response?: { headers?: { get?: (key: string) => string | null } | Record<string, string | undefined> };
            headers?: { get?: (key: string) => string | null } | Record<string, string | undefined>;
        };

        const tryHeaders = (headers: unknown) => {
            if (!headers || typeof headers !== "object") {
                return null;
            }

            const withGetter = headers as { get?: (key: string) => string | null };
            if (typeof withGetter.get === "function") {
                return parseRetryAfterMs(withGetter.get("retry-after"));
            }

            const asRecord = headers as Record<string, string | undefined>;
            return parseRetryAfterMs(asRecord["retry-after"] ?? asRecord["Retry-After"] ?? null);
        };

        return tryHeaders(candidate.response?.headers) ?? tryHeaders(candidate.headers);
    }

    private isRetryableError(error: unknown) {
        const status = this.getStatusCode(error);
        if (status && RETRYABLE_STATUS.has(status)) {
            return true;
        }

        if (!(error instanceof Error)) {
            return false;
        }

        const message = error.message.toLowerCase();
        return message.includes("network") ||
            message.includes("timeout") ||
            message.includes("timed out") ||
            message.includes("fetch failed") ||
            message.includes("econnreset") ||
            message.includes("eai_again");
    }

    private async callWithRetry<T>(call: () => Promise<T>) {
        let lastError: unknown = null;

        for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
            try {
                return await call();
            } catch (error) {
                lastError = error;
                if (!this.isRetryableError(error) || attempt === MAX_RETRY_ATTEMPTS) {
                    throw error;
                }

                const retryAfterMs = this.getRetryAfterMs(error);
                const delayMs = retryAfterMs ?? computeBackoffMs(attempt);
                await sleep(delayMs);
            }
        }

        throw (lastError instanceof Error ? lastError : new Error("Todoist API request failed"));
    }

    getProjects(args?: GetProjectsArgs) {
        return this.callWithRetry(() => this.api.getProjects(args));
    }

    getLabels(args?: GetLabelsArgs) {
        return this.callWithRetry(() => this.api.getLabels(args));
    }

    getTasks(args?: GetTasksArgs) {
        return this.callWithRetry(() => this.api.getTasks(args));
    }

    getCompletedTasksByCompletionDate(payload: GetCompletedTasksByCompletionDateArgs) {
        return this.callWithRetry(() => this.api.getCompletedTasksByCompletionDate(payload));
    }

    createTask(payload: AddTaskArgs) {
        return this.callWithRetry(() => this.api.addTask(payload));
    }

    createLabel(payload: AddLabelArgs) {
        return this.callWithRetry(() => this.api.addLabel(payload));
    }

    updateLabel(labelId: string, payload: UpdateLabelArgs) {
        return this.callWithRetry(() => this.api.updateLabel(labelId, payload));
    }

    updateTask(taskId: string, payload: UpdateTaskArgs) {
        return this.callWithRetry(() => this.api.updateTask(taskId, payload));
    }

    moveTask(taskId: string, payload: MoveTaskArgs) {
        return this.callWithRetry(() => this.api.moveTask(taskId, payload));
    }

    closeTask(taskId: string) {
        return this.callWithRetry(() => this.api.closeTask(taskId));
    }

    reopenTask(taskId: string) {
        return this.callWithRetry(() => this.api.reopenTask(taskId));
    }

    deleteTask(taskId: string) {
        return this.callWithRetry(() => this.api.deleteTask(taskId));
    }
}
