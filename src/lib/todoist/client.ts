import { TodoistApi } from "@doist/todoist-api-typescript";
import type {
    UpdateTaskArgs,
    AddTaskArgs,
    AddLabelArgs,
    UpdateLabelArgs,
    MoveTaskArgs,
    GetCompletedTasksByCompletionDateArgs,
} from "@doist/todoist-api-typescript";

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

    getCompletedTasksByCompletionDate(payload: GetCompletedTasksByCompletionDateArgs) {
        return this.api.getCompletedTasksByCompletionDate(payload);
    }

    createTask(payload: AddTaskArgs) {
        return this.api.addTask(payload);
    }

    createLabel(payload: AddLabelArgs) {
        return this.api.addLabel(payload);
    }

    updateLabel(labelId: string, payload: UpdateLabelArgs) {
        return this.api.updateLabel(labelId, payload);
    }

    updateTask(taskId: string, payload: UpdateTaskArgs) {
        return this.api.updateTask(taskId, payload);
    }

    moveTask(taskId: string, payload: MoveTaskArgs) {
        return this.api.moveTask(taskId, payload);
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
