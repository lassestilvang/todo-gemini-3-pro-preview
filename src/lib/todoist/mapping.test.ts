import { describe, expect, it } from "bun:test";
import { applyListLabelMapping, resolveTodoistTaskListId } from "./mapping";

const baseMappings = {
    projects: [
        { projectId: "p1", listId: 10 },
        { projectId: "p2", listId: 11 },
    ],
    labels: [
        { labelId: "l1", listId: 20 },
        { labelId: "l2", listId: 21 },
    ],
};

describe("todoist mapping helpers", () => {
    it("maps list id to project when available", () => {
        const mapping = applyListLabelMapping(10, baseMappings);
        expect(mapping.projectId).toBe("p1");
        expect(mapping.labelIds).toBeUndefined();
    });

    it("maps list id to label when no project match", () => {
        const mapping = applyListLabelMapping(21, baseMappings);
        expect(mapping.labelIds).toEqual(["l2"]);
    });

    it("resolves task list by project", () => {
        const listId = resolveTodoistTaskListId({ id: "t1", content: "Task", projectId: "p2" } as never, baseMappings);
        expect(listId).toBe(11);
    });

    it("resolves task list by label", () => {
        const listId = resolveTodoistTaskListId({ id: "t2", content: "Task", labels: ["l1"] } as never, baseMappings);
        expect(listId).toBe(20);
    });
});
