import { describe, it, expect } from "bun:test";
import { startOfDay } from "date-fns";
import {
    normalizeDueAnchor,
    getDueRange,
    isDueOverdue,
    isInCurrentPeriod,
} from "./due-utils";

describe("due-utils", () => {
    it("normalizes to week start with Monday", () => {
        const input = new Date("2025-04-09T12:00:00Z"); // Wednesday
        const normalized = normalizeDueAnchor(input, "week", true);
        expect(normalized.getDay()).toBe(1);
    });

    it("computes month range", () => {
        const anchor = new Date("2025-03-01T00:00:00Z");
        const range = getDueRange(anchor, "month", false);
        expect(range.start.toISOString()).toBe(anchor.toISOString());
        expect(range.endExclusive.getMonth()).toBe(3);
    });

    it("flags period overdue after end", () => {
        const anchor = new Date("2025-01-01T00:00:00Z");
        const now = new Date("2026-01-01T00:00:00Z");
        expect(isDueOverdue({ dueDate: anchor, dueDatePrecision: "year" }, now, false)).toBe(true);
    });

    it("detects current period inclusion", () => {
        const today = startOfDay(new Date());
        const weekAnchor = normalizeDueAnchor(today, "week", false);
        expect(isInCurrentPeriod({ dueDate: weekAnchor, dueDatePrecision: "week" }, today, false)).toBe(true);
    });
});
