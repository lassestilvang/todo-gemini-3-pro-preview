import { TodoistApi } from "@doist/todoist-api-typescript";
import type { UpdateTaskArgs, AddTaskArgs } from "@doist/todoist-api-typescript";

export class TodoistClient {
    private api: TodoistApi;

    constructor(token: string) {
        this.api = new TodoistApi(token);
    }

    getProjects() {
        return this.api.getProjects();
    }

    getLabels() {
        return this.api.getLabels();
    }

    getTasks() {
        return this.api.getTasks();
    }

    createTask(payload: AddTaskArgs) {
        return this.api.addTask(payload);
    }

    updateTask(taskId: string, payload: UpdateTaskArgs) {
        return this.api.updateTask(taskId, payload);
    }

    closeTask(taskId: string) {
        return this.api.closeTask(taskId);
    }

    reopenTask(taskId: string) {
        return this.api.reopenTask(taskId);
    }

    deleteTask(taskId: string) {
        return this.api.deleteTask(taskId);
    }
}
