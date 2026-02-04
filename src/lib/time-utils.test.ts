
import { describe, it, expect } from "bun:test";
import { formatFriendlyDate } from "./time-utils";
import { addDays, subDays } from "date-fns";

describe("formatFriendlyDate", () => {
    it("formats today as 'Today'", () => {
        const today = new Date();
        expect(formatFriendlyDate(today)).toBe("Today");
    });

    it("formats tomorrow as 'Tomorrow'", () => {
        const tomorrow = addDays(new Date(), 1);
        expect(formatFriendlyDate(tomorrow)).toBe("Tomorrow");
    });

    it("formats yesterday as 'Yesterday'", () => {
        const yesterday = subDays(new Date(), 1);
        expect(formatFriendlyDate(yesterday)).toBe("Yesterday");
    });

    it("formats future dates with fallback format", () => {
        const future = addDays(new Date(), 10);
        // Expect format to not be Today/Tomorrow/Yesterday
        const formatted = formatFriendlyDate(future, "MMM d");
        expect(formatted).not.toBe("Today");
        expect(formatted).not.toBe("Tomorrow");
        expect(formatted).not.toBe("Yesterday");
        // Verify it matches standard format
        // We can't strictly match without re-implementing format, but we can check it's not the special keywords.
        // Or check length/content roughly.
        expect(formatted.length).toBeGreaterThan(3);
    });

    it("formats past dates with fallback format", () => {
        const past = subDays(new Date(), 10);
        const formatted = formatFriendlyDate(past, "MMM d");
        expect(formatted).not.toBe("Today");
        expect(formatted).not.toBe("Tomorrow");
        expect(formatted).not.toBe("Yesterday");
    });

    it("handles number input", () => {
        const today = new Date();
        expect(formatFriendlyDate(today.getTime())).toBe("Today");
    });
});
