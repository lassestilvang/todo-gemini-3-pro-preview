import { describe, it, expect } from "bun:test";
import { parseNaturalLanguage } from "./nlp-parser";
import { startOfToday, startOfTomorrow, addDays, addWeeks, addMonths, addYears, nextMonday, nextFriday, startOfWeek, startOfMonth, startOfYear } from "date-fns";

describe("nlp-parser", () => {
    describe("parseNaturalLanguage", () => {
        it("should parse plain text as title", () => {
            const result = parseNaturalLanguage("Buy groceries");
            expect(result.title).toBe("Buy groceries");
            expect(result.priority).toBeUndefined();
            expect(result.dueDate).toBeUndefined();
        });

        describe("priority parsing", () => {
            it("should parse !high priority", () => {
                const result = parseNaturalLanguage("Important task !high");
                expect(result.title).toBe("Important task");
                expect(result.priority).toBe("high");
            });

            it("should parse !h shorthand for high", () => {
                const result = parseNaturalLanguage("Urgent !h");
                expect(result.title).toBe("Urgent");
                expect(result.priority).toBe("high");
            });

            it("should parse !medium priority", () => {
                const result = parseNaturalLanguage("Regular task !medium");
                expect(result.title).toBe("Regular task");
                expect(result.priority).toBe("medium");
            });

            it("should parse !m shorthand for medium", () => {
                const result = parseNaturalLanguage("Normal !m");
                expect(result.title).toBe("Normal");
                expect(result.priority).toBe("medium");
            });

            it("should parse !low priority", () => {
                const result = parseNaturalLanguage("Low priority task !low");
                expect(result.title).toBe("Low priority task");
                expect(result.priority).toBe("low");
            });
        });

        describe("date parsing", () => {
            it("should parse 'today'", () => {
                const result = parseNaturalLanguage("Do something today");
                expect(result.title).toBe("Do something");
                expect(result.dueDate?.toDateString()).toBe(startOfToday().toDateString());
            });

            it("should parse 'tomorrow'", () => {
                const result = parseNaturalLanguage("Call John tomorrow");
                expect(result.title).toBe("Call John");
                expect(result.dueDate?.toDateString()).toBe(startOfTomorrow().toDateString());
            });

            it("should parse 'in X days'", () => {
                const result = parseNaturalLanguage("Finish report in 3 days");
                expect(result.title).toBe("Finish report");
                expect(result.dueDate?.toDateString()).toBe(addDays(startOfToday(), 3).toDateString());
            });

            it("should parse 'in X weeks'", () => {
                const result = parseNaturalLanguage("Review project in 2 weeks");
                expect(result.title).toBe("Review project");
                expect(result.dueDate?.toDateString()).toBe(addWeeks(startOfToday(), 2).toDateString());
            });

            it("should parse 'in X months'", () => {
                const result = parseNaturalLanguage("Annual review in 1 month");
                expect(result.title).toBe("Annual review");
                expect(result.dueDate?.toDateString()).toBe(addMonths(startOfToday(), 1).toDateString());
            });

            it("should parse 'next monday'", () => {
                const result = parseNaturalLanguage("Meeting next monday");
                expect(result.title).toBe("Meeting");
                expect(result.dueDate?.toDateString()).toBe(nextMonday(startOfToday()).toDateString());
            });

            it("should parse 'next friday'", () => {
                const result = parseNaturalLanguage("Submit next friday");
                expect(result.title).toBe("Submit");
                expect(result.dueDate?.toDateString()).toBe(nextFriday(startOfToday()).toDateString());
            });

            it("should parse 'this week' with precision", () => {
                const result = parseNaturalLanguage("Plan this week", { weekStartsOnMonday: true });
                expect(result.title).toBe("Plan");
                expect(result.dueDatePrecision).toBe("week");
                expect(result.dueDate?.toDateString()).toBe(startOfWeek(startOfToday(), { weekStartsOn: 1 }).toDateString());
            });

            it("should parse 'next month' with precision", () => {
                const result = parseNaturalLanguage("Tax prep next month");
                expect(result.title).toBe("Tax prep");
                expect(result.dueDatePrecision).toBe("month");
                expect(result.dueDate?.toDateString()).toBe(startOfMonth(addMonths(startOfToday(), 1)).toDateString());
            });

            it("should parse 'next year' with precision", () => {
                const result = parseNaturalLanguage("Learn piano next year");
                expect(result.title).toBe("Learn piano");
                expect(result.dueDatePrecision).toBe("year");
                expect(result.dueDate?.toDateString()).toBe(startOfYear(addYears(startOfToday(), 1)).toDateString());
            });
        });

        describe("context parsing", () => {
            it("should parse @computer context", () => {
                const result = parseNaturalLanguage("Write code @computer");
                expect(result.title).toBe("Write code");
                expect(result.context).toBe("computer");
            });

            it("should parse @phone context", () => {
                const result = parseNaturalLanguage("Call mom @phone");
                expect(result.title).toBe("Call mom");
                expect(result.context).toBe("phone");
            });

            it("should parse @errands context", () => {
                const result = parseNaturalLanguage("Buy milk @errands");
                expect(result.title).toBe("Buy milk");
                expect(result.context).toBe("errands");
            });

            it("should parse 💻 emoji as computer context", () => {
                const result = parseNaturalLanguage("Code review 💻");
                expect(result.title).toBe("Code review");
                expect(result.context).toBe("computer");
            });

            it("should parse 📱 emoji as phone context", () => {
                const result = parseNaturalLanguage("Text friend 📱");
                expect(result.title).toBe("Text friend");
                expect(result.context).toBe("phone");
            });
        });

        describe("energy level parsing", () => {
            it("should parse @energy:high", () => {
                const result = parseNaturalLanguage("Deep work @energy:high");
                expect(result.title).toBe("Deep work");
                expect(result.energyLevel).toBe("high");
            });

            it("should parse @energy:low", () => {
                const result = parseNaturalLanguage("Admin tasks @energy:low");
                expect(result.title).toBe("Admin tasks");
                expect(result.energyLevel).toBe("low");
            });
        });

        describe("combined parsing", () => {
            it("should parse multiple attributes", () => {
                const result = parseNaturalLanguage("Buy milk tomorrow !high @errands");
                expect(result.title).toBe("Buy milk");
                expect(result.priority).toBe("high");
                expect(result.dueDate?.toDateString()).toBe(startOfTomorrow().toDateString());
                expect(result.context).toBe("errands");
            });
        });
    });
});
