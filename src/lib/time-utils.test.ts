
import { describe, it, expect } from "bun:test";
import { formatFriendlyDate, formatDateShort, formatDateLong, formatTimeManual, formatTimePreference } from "./time-utils";
import { addDays, subDays, format } from "date-fns";

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
        // Check if it matches manual format (e.g. "Oct 25")
        // We can check if it contains a space and month part
        expect(formatted).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    });

    it("formats past dates with fallback format", () => {
        const past = subDays(new Date(), 10);
        const formatted = formatFriendlyDate(past, "MMM d");
        expect(formatted).not.toBe("Today");
        expect(formatted).not.toBe("Tomorrow");
        expect(formatted).not.toBe("Yesterday");
        expect(formatted).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    });

    it("handles number input", () => {
        const today = new Date();
        expect(formatFriendlyDate(today.getTime())).toBe("Today");
    });
});

describe("formatDateShort (manual)", () => {
    it("formats date as 'MMM d'", () => {
        const date = new Date("2023-10-25T12:00:00");
        expect(formatDateShort(date)).toBe("Oct 25");
    });

    it("formats single digit day correctly", () => {
        const date = new Date("2023-01-05T12:00:00");
        expect(formatDateShort(date)).toBe("Jan 5");
    });
    });

    describe("formatDateLong", () => {
        it("should match format() output for complex dates", () => {
            const dates = [
                new Date(2025, 0, 1), // Jan 1st
                new Date(2025, 1, 2), // Feb 2nd
                new Date(2025, 2, 3), // Mar 3rd
                new Date(2025, 3, 4), // Apr 4th
                new Date(2025, 4, 11), // May 11th
                new Date(2025, 5, 21), // Jun 21st
                new Date(2025, 6, 22), // Jul 22nd
                new Date(2025, 7, 23), // Aug 23rd
                new Date(2025, 8, 30), // Sep 30th
                new Date(2025, 11, 25), // Dec 25th
            ];

            for (const date of dates) {
                expect(formatDateLong(date)).toBe(format(date, "eeee, MMMM do, yyyy"));
            }
        });
});

describe("formatTimeManual", () => {
    it("formats 24h time correctly", () => {
        const date = new Date("2023-10-25T14:05:00");
        expect(formatTimeManual(date, true)).toBe("14:05");
    });

    it("formats 24h midnight correctly", () => {
        const date = new Date("2023-10-25T00:05:00");
        expect(formatTimeManual(date, true)).toBe("00:05");
    });

    it("formats 12h PM time correctly", () => {
        const date = new Date("2023-10-25T14:05:00");
        expect(formatTimeManual(date, false)).toBe("2:05 PM");
    });

    it("formats 12h AM time correctly", () => {
        const date = new Date("2023-10-25T09:05:00");
        expect(formatTimeManual(date, false)).toBe("9:05 AM");
    });

    it("formats 12h Noon correctly", () => {
        const date = new Date("2023-10-25T12:00:00");
        expect(formatTimeManual(date, false)).toBe("12:00 PM");
    });

    it("formats 12h Midnight correctly", () => {
        const date = new Date("2023-10-25T00:00:00");
        expect(formatTimeManual(date, false)).toBe("12:00 AM");
    });
});

describe("formatTimePreference", () => {
    it("uses manual formatter for default time type", () => {
        const date = new Date("2023-10-25T14:05:00");
        // Force 24h
        expect(formatTimePreference(date, true)).toBe("14:05");
        // Force 12h
        expect(formatTimePreference(date, false)).toBe("2:05 PM");
    });
});
