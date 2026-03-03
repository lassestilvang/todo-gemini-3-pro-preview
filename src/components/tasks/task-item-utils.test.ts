import { describe, it, expect } from "bun:test";
import { areTaskPropsEqual } from "./task-item-utils";
import type { TaskItemProps } from "./TaskItem";
import type { Task } from "@/lib/types";

const baseTask: Task = {
    id: 1,
    title: "Test Task",
    description: "Test Description",
    priority: "medium",
    dueDate: new Date("2023-01-01"),
    deadline: null,
    isCompleted: false,
    estimateMinutes: 30,
    actualMinutes: null,
    isRecurring: false,
    listId: 1,
    recurringRule: null,
    labels: [],
    energyLevel: "medium",
    context: "computer",
    isHabit: false,
    position: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
};

const baseProps: TaskItemProps = {
    task: baseTask,
    userId: "user-1",
    showListInfo: true,
    disableAnimations: false,
    isClient: true,
    performanceMode: false,
    userPreferences: { use24HourClock: false, weekStartsOnMonday: false },
};

describe("areTaskPropsEqual", () => {
    it("returns true for identical props", () => {
        expect(areTaskPropsEqual(baseProps, { ...baseProps })).toBe(true);
    });

    it("returns false when energyLevel changes", () => {
        const nextProps = {
            ...baseProps,
            task: { ...baseTask, energyLevel: "high" as const }
        };
        expect(areTaskPropsEqual(baseProps, nextProps)).toBe(false);
    });

    it("returns false when context changes", () => {
        const nextProps = {
            ...baseProps,
            task: { ...baseTask, context: "home" as const }
        };
        expect(areTaskPropsEqual(baseProps, nextProps)).toBe(false);
    });

    it("returns false when dragAttributes change", () => {
        const prevProps = {
            ...baseProps,
            dragAttributes: { role: "button", tabIndex: 0 } as any
        };
        const nextProps = {
            ...baseProps,
            dragAttributes: { role: "button", tabIndex: -1 } as any
        };
        expect(areTaskPropsEqual(prevProps, nextProps)).toBe(false);
    });

    it("returns false when dragHandleProps change", () => {
        const prevProps = {
            ...baseProps,
            dragHandleProps: { onPointerDown: () => {} } as any
        };
        const nextProps = {
            ...baseProps,
            dragHandleProps: { onPointerDown: () => {} } as any // New function reference
        };
        expect(areTaskPropsEqual(prevProps, nextProps)).toBe(false);
    });
});
