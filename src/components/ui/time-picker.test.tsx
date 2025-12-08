import { describe, it, expect, afterEach } from "bun:test";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { TimePicker, generateTimeOptions, parseTimeInput, roundUpTo15Minutes } from "./time-picker";
import * as fc from "fast-check";

describe("TimePicker utility functions", () => {
    describe("roundUpTo15Minutes", () => {
        it("rounds 10:07 to 10:15", () => {
            const date = new Date("2023-12-07T10:07:00");
            const result = roundUpTo15Minutes(date);
            expect(result.getHours()).toBe(10);
            expect(result.getMinutes()).toBe(15);
        });

        it("rounds 10:00 to 10:15 (adds 15 min if already on boundary)", () => {
            const date = new Date("2023-12-07T10:00:00");
            const result = roundUpTo15Minutes(date);
            expect(result.getHours()).toBe(10);
            expect(result.getMinutes()).toBe(15);
        });

        it("rounds 10:45 to 11:00", () => {
            const date = new Date("2023-12-07T10:45:00");
            const result = roundUpTo15Minutes(date);
            expect(result.getHours()).toBe(11);
            expect(result.getMinutes()).toBe(0);
        });

        it("rounds 23:50 to 00:00 next day", () => {
            const date = new Date("2023-12-07T23:50:00");
            const result = roundUpTo15Minutes(date);
            expect(result.getHours()).toBe(0);
            expect(result.getMinutes()).toBe(0);
        });

        /**
         * **Feature: time-picker, Property 1: Round-up to 15-minute interval**
         * **Validates: Requirements 1.2**
         * 
         * *For any* Date object, the `roundUpTo15Minutes` function SHALL return a Date where:
         * - The minutes are divisible by 15 (0, 15, 30, or 45)
         * - The result is strictly greater than the input time
         * - The result is at most 15 minutes after the input time
         */
        it("property: result minutes are always divisible by 15", () => {
            // Generate valid dates using integer timestamps within reasonable range
            const validDateArb = fc.integer({ min: 946684800000, max: 4102444800000 }).map(ts => new Date(ts));
            fc.assert(
                fc.property(validDateArb, (date) => {
                    const result = roundUpTo15Minutes(date);
                    return result.getMinutes() % 15 === 0;
                }),
                { numRuns: 100 }
            );
        });

        it("property: result is strictly greater than input", () => {
            const validDateArb = fc.integer({ min: 946684800000, max: 4102444800000 }).map(ts => new Date(ts));
            fc.assert(
                fc.property(validDateArb, (date) => {
                    const result = roundUpTo15Minutes(date);
                    return result.getTime() > date.getTime();
                }),
                { numRuns: 100 }
            );
        });

        it("property: result is at most 15 minutes after input", () => {
            const validDateArb = fc.integer({ min: 946684800000, max: 4102444800000 }).map(ts => new Date(ts));
            fc.assert(
                fc.property(validDateArb, (date) => {
                    const result = roundUpTo15Minutes(date);
                    const diffMs = result.getTime() - date.getTime();
                    return diffMs > 0 && diffMs <= 15 * 60 * 1000;
                }),
                { numRuns: 100 }
            );
        });
    });

    describe("parseTimeInput", () => {
        it("parses HH:mm format", () => {
            expect(parseTimeInput("14:30")).toBe("14:30");
            expect(parseTimeInput("09:15")).toBe("09:15");
            expect(parseTimeInput("00:00")).toBe("00:00");
        });

        it("parses H:mm format", () => {
            expect(parseTimeInput("9:15")).toBe("09:15");
        });

        it("parses HHmm format without colon", () => {
            expect(parseTimeInput("1430")).toBe("14:30");
            expect(parseTimeInput("0915")).toBe("09:15");
        });

        it("parses HH format (just hours)", () => {
            expect(parseTimeInput("14")).toBe("14:00");
            expect(parseTimeInput("9")).toBe("09:00");
        });

        it("returns null for invalid times", () => {
            expect(parseTimeInput("25:00")).toBe(null);
            expect(parseTimeInput("14:60")).toBe(null);
            expect(parseTimeInput("abc")).toBe(null);
        });

        /**
         * **Feature: time-picker, Property 2: Valid time parsing produces correct format**
         * **Validates: Requirements 1.4, 5.1, 5.2, 5.3, 5.4**
         * 
         * *For any* valid time input string (in HH:mm, H:mm, HHmm, or HH format), 
         * the `parseTimeInput` function SHALL return a string in "HH:mm" format where:
         * - Hours are zero-padded to 2 digits
         * - Minutes are zero-padded to 2 digits
         * - The parsed hours and minutes match the input values
         */
        it("property: valid HH:mm input produces correct HH:mm output", () => {
            const validHours = fc.integer({ min: 0, max: 23 });
            const validMinutes = fc.integer({ min: 0, max: 59 });
            
            fc.assert(
                fc.property(validHours, validMinutes, (hours, minutes) => {
                    const input = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
                    const result = parseTimeInput(input);
                    return result === input;
                }),
                { numRuns: 100 }
            );
        });

        it("property: valid H:mm input produces zero-padded HH:mm output", () => {
            const singleDigitHours = fc.integer({ min: 0, max: 9 });
            const validMinutes = fc.integer({ min: 0, max: 59 });
            
            fc.assert(
                fc.property(singleDigitHours, validMinutes, (hours, minutes) => {
                    const input = `${hours}:${minutes.toString().padStart(2, "0")}`;
                    const expected = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
                    const result = parseTimeInput(input);
                    return result === expected;
                }),
                { numRuns: 100 }
            );
        });

        it("property: valid HHmm input produces correct HH:mm output", () => {
            const validHours = fc.integer({ min: 0, max: 23 });
            const validMinutes = fc.integer({ min: 0, max: 59 });
            
            fc.assert(
                fc.property(validHours, validMinutes, (hours, minutes) => {
                    const input = `${hours.toString().padStart(2, "0")}${minutes.toString().padStart(2, "0")}`;
                    const expected = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
                    const result = parseTimeInput(input);
                    return result === expected;
                }),
                { numRuns: 100 }
            );
        });

        it("property: valid HH input produces HH:00 output", () => {
            const validHours = fc.integer({ min: 0, max: 23 });
            
            fc.assert(
                fc.property(validHours, (hours) => {
                    const input = hours.toString().padStart(2, "0");
                    const expected = `${input}:00`;
                    const result = parseTimeInput(input);
                    return result === expected;
                }),
                { numRuns: 100 }
            );
        });

        /**
         * **Feature: time-picker, Property 3: Invalid time rejection**
         * **Validates: Requirements 1.5, 5.5**
         * 
         * *For any* time input string where hours > 23 or minutes > 59 or contains 
         * non-numeric characters (except colon), the `parseTimeInput` function SHALL return null.
         */
        it("property: invalid hours (>23) returns null", () => {
            const invalidHours = fc.integer({ min: 24, max: 99 });
            const validMinutes = fc.integer({ min: 0, max: 59 });
            
            fc.assert(
                fc.property(invalidHours, validMinutes, (hours, minutes) => {
                    const input = `${hours}:${minutes.toString().padStart(2, "0")}`;
                    return parseTimeInput(input) === null;
                }),
                { numRuns: 100 }
            );
        });

        it("property: invalid minutes (>59) returns null", () => {
            const validHours = fc.integer({ min: 0, max: 23 });
            const invalidMinutes = fc.integer({ min: 60, max: 99 });
            
            fc.assert(
                fc.property(validHours, invalidMinutes, (hours, minutes) => {
                    const input = `${hours.toString().padStart(2, "0")}:${minutes}`;
                    return parseTimeInput(input) === null;
                }),
                { numRuns: 100 }
            );
        });

        it("property: non-numeric input returns null", () => {
            // Generate strings with at least one letter
            const nonNumericInput = fc.stringMatching(/^[a-zA-Z]+$/);
            
            fc.assert(
                fc.property(nonNumericInput, (input) => {
                    return parseTimeInput(input) === null;
                }),
                { numRuns: 100 }
            );
        });
    });

    describe("generateTimeOptions", () => {
        it("generates 96 time options (24 hours in 15-min intervals)", () => {
            const options = generateTimeOptions(new Date("2023-12-07T10:00:00"));
            expect(options.length).toBe(96);
        });

        it("starts from rounded up time", () => {
            const options = generateTimeOptions(new Date("2023-12-07T10:07:00"));
            expect(options[0]).toBe("10:15");
        });

        it("includes correct sequence of times", () => {
            const options = generateTimeOptions(new Date("2023-12-07T10:00:00"));
            expect(options[0]).toBe("10:15");
            expect(options[1]).toBe("10:30");
            expect(options[2]).toBe("10:45");
            expect(options[3]).toBe("11:00");
        });
    });
});

describe("TimePicker component", () => {
    afterEach(() => {
        cleanup();
        document.body.innerHTML = "";
    });

    it("should render with placeholder", () => {
        render(<TimePicker setTime={() => { }} />);
        expect(screen.getByPlaceholderText("Select time")).toBeInTheDocument();
    });

    it("should render with custom placeholder", () => {
        render(<TimePicker setTime={() => { }} placeholder="Pick a time" />);
        expect(screen.getByPlaceholderText("Pick a time")).toBeInTheDocument();
    });

    it("should render with initial time value", () => {
        render(<TimePicker time="14:30" setTime={() => { }} />);
        expect(screen.getByDisplayValue("14:30")).toBeInTheDocument();
    });

    it("should open suggestions on focus", async () => {
        render(<TimePicker setTime={() => { }} />);
        const input = screen.getByPlaceholderText("Select time");
        fireEvent.focus(input);

        await waitFor(() => {
            // Check that the popover content is visible by looking for any time option
            const options = screen.getAllByRole("option");
            const timeOptions = options.filter(opt => /^\d{2}:\d{2}$/.test(opt.textContent || ""));
            expect(timeOptions.length).toBeGreaterThan(0);
        }, { timeout: 2000 });
    });

    it("should call setTime when selecting from dropdown", async () => {
        let selectedTime: string | undefined;
        render(<TimePicker setTime={(t) => { selectedTime = t; }} />);

        const input = screen.getByPlaceholderText("Select time");
        fireEvent.focus(input);

        await waitFor(() => {
            const options = screen.getAllByRole("option");
            const firstTimeOption = options.find(opt => /^\d{2}:\d{2}$/.test(opt.textContent || ""));
            if (firstTimeOption) {
                fireEvent.click(firstTimeOption);
            }
        });

        expect(selectedTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it("should update input value on change", () => {
        render(<TimePicker setTime={() => { }} />);
        const input = screen.getByPlaceholderText("Select time") as HTMLInputElement;

        fireEvent.change(input, { target: { value: "15:45" } });
        expect(input.value).toBe("15:45");
    });

    it("should parse and validate time on blur with valid input", async () => {
        let selectedTime: string | undefined;
        render(<TimePicker setTime={(t) => { selectedTime = t; }} />);
        const input = screen.getByPlaceholderText("Select time") as HTMLInputElement;

        fireEvent.change(input, { target: { value: "9:30" } });
        fireEvent.blur(input);

        await waitFor(() => {
            expect(input.value).toBe("09:30");
            expect(selectedTime).toBe("09:30");
        });
    });

    it("should revert to previous value on blur with invalid input", async () => {
        let selectedTime: string | undefined = "14:00";
        render(<TimePicker time="14:00" setTime={(t) => { selectedTime = t; }} />);
        const input = screen.getByPlaceholderText("Select time") as HTMLInputElement;

        fireEvent.change(input, { target: { value: "25:00" } });
        fireEvent.blur(input);

        await waitFor(() => {
            expect(input.value).toBe("14:00");
            expect(selectedTime).toBe("14:00");
        });
    });

    it("should apply time value on Enter key", async () => {
        let selectedTime: string | undefined;
        render(<TimePicker setTime={(t) => { selectedTime = t; }} />);
        const input = screen.getByPlaceholderText("Select time") as HTMLInputElement;

        fireEvent.change(input, { target: { value: "16:45" } });
        fireEvent.keyDown(input, { key: "Enter" });

        await waitFor(() => {
            expect(input.value).toBe("16:45");
            expect(selectedTime).toBe("16:45");
        });
    });

    it("should revert and close on Escape key", async () => {
        render(<TimePicker time="10:00" setTime={() => { }} />);
        const input = screen.getByPlaceholderText("Select time") as HTMLInputElement;

        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "18:30" } });
        fireEvent.keyDown(input, { key: "Escape" });

        await waitFor(() => {
            expect(input.value).toBe("10:00");
        });
    });

    it("should show clear button when time is set", async () => {
        render(<TimePicker time="14:30" setTime={() => { }} />);
        const input = screen.getByPlaceholderText("Select time");
        fireEvent.focus(input);

        await waitFor(() => {
            expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
        });
    });

    it("should clear time when clear button is clicked", async () => {
        let selectedTime: string | undefined = "14:30";
        render(<TimePicker time="14:30" setTime={(t) => { selectedTime = t; }} />);
        const input = screen.getByPlaceholderText("Select time");
        fireEvent.focus(input);

        await waitFor(() => {
            const clearButton = screen.getByRole("button", { name: /clear/i });
            fireEvent.click(clearButton);
        });

        expect(selectedTime).toBeUndefined();
    });

    it("should clear time when input is emptied and blurred", async () => {
        let selectedTime: string | undefined = "14:30";
        render(<TimePicker time="14:30" setTime={(t) => { selectedTime = t; }} />);
        const input = screen.getByPlaceholderText("Select time") as HTMLInputElement;

        fireEvent.change(input, { target: { value: "" } });
        fireEvent.blur(input);

        await waitFor(() => {
            expect(selectedTime).toBeUndefined();
        });
    });
});

/**
 * **Feature: time-picker, Property 4: Date-time component independence**
 * **Validates: Requirements 3.2, 3.3**
 * 
 * *For any* Date object with both date and time components:
 * - When the date is changed, the hours and minutes SHALL remain unchanged
 * - When the time is changed, the year, month, and day SHALL remain unchanged
 */
describe("Date-time component independence", () => {
    // Helper functions that mirror the logic in TaskDetailsTab
    function changeDatePreservingTime(originalDate: Date | undefined, newDate: Date): Date {
        const hours = originalDate?.getHours() ?? 0;
        const minutes = originalDate?.getMinutes() ?? 0;
        const result = new Date(newDate);
        result.setHours(hours, minutes, 0, 0);
        return result;
    }

    function changeTimePreservingDate(originalDate: Date, timeString: string): Date {
        const [hours, minutes] = timeString.split(":").map(Number);
        const result = new Date(originalDate);
        result.setHours(hours, minutes, 0, 0);
        return result;
    }

    it("property: changing date preserves hours and minutes", () => {
        // Generate valid dates with specific hours and minutes
        const validDateArb = fc.record({
            year: fc.integer({ min: 2000, max: 2100 }),
            month: fc.integer({ min: 0, max: 11 }),
            day: fc.integer({ min: 1, max: 28 }), // Use 28 to avoid month overflow issues
            hours: fc.integer({ min: 0, max: 23 }),
            minutes: fc.integer({ min: 0, max: 59 })
        });

        const newDateArb = fc.record({
            year: fc.integer({ min: 2000, max: 2100 }),
            month: fc.integer({ min: 0, max: 11 }),
            day: fc.integer({ min: 1, max: 28 })
        });

        fc.assert(
            fc.property(validDateArb, newDateArb, (original, newDateParts) => {
                const originalDate = new Date(original.year, original.month, original.day, original.hours, original.minutes);
                const newDate = new Date(newDateParts.year, newDateParts.month, newDateParts.day);
                
                const result = changeDatePreservingTime(originalDate, newDate);
                
                // Hours and minutes should be preserved from original
                return result.getHours() === original.hours && 
                       result.getMinutes() === original.minutes;
            }),
            { numRuns: 100 }
        );
    });

    it("property: changing time preserves year, month, and day", () => {
        const validDateArb = fc.record({
            year: fc.integer({ min: 2000, max: 2100 }),
            month: fc.integer({ min: 0, max: 11 }),
            day: fc.integer({ min: 1, max: 28 }),
            hours: fc.integer({ min: 0, max: 23 }),
            minutes: fc.integer({ min: 0, max: 59 })
        });

        const newTimeArb = fc.record({
            hours: fc.integer({ min: 0, max: 23 }),
            minutes: fc.integer({ min: 0, max: 59 })
        });

        fc.assert(
            fc.property(validDateArb, newTimeArb, (original, newTime) => {
                const originalDate = new Date(original.year, original.month, original.day, original.hours, original.minutes);
                const timeString = `${newTime.hours.toString().padStart(2, "0")}:${newTime.minutes.toString().padStart(2, "0")}`;
                
                const result = changeTimePreservingDate(originalDate, timeString);
                
                // Year, month, and day should be preserved from original
                return result.getFullYear() === original.year && 
                       result.getMonth() === original.month &&
                       result.getDate() === original.day;
            }),
            { numRuns: 100 }
        );
    });

    it("property: changing date then time results in correct combined date-time", () => {
        const validDateArb = fc.record({
            year: fc.integer({ min: 2000, max: 2100 }),
            month: fc.integer({ min: 0, max: 11 }),
            day: fc.integer({ min: 1, max: 28 }),
            hours: fc.integer({ min: 0, max: 23 }),
            minutes: fc.integer({ min: 0, max: 59 })
        });

        const newDateArb = fc.record({
            year: fc.integer({ min: 2000, max: 2100 }),
            month: fc.integer({ min: 0, max: 11 }),
            day: fc.integer({ min: 1, max: 28 })
        });

        const newTimeArb = fc.record({
            hours: fc.integer({ min: 0, max: 23 }),
            minutes: fc.integer({ min: 0, max: 59 })
        });

        fc.assert(
            fc.property(validDateArb, newDateArb, newTimeArb, (original, newDateParts, newTime) => {
                const originalDate = new Date(original.year, original.month, original.day, original.hours, original.minutes);
                const newDate = new Date(newDateParts.year, newDateParts.month, newDateParts.day);
                const timeString = `${newTime.hours.toString().padStart(2, "0")}:${newTime.minutes.toString().padStart(2, "0")}`;
                
                // First change date, then change time
                const afterDateChange = changeDatePreservingTime(originalDate, newDate);
                const result = changeTimePreservingDate(afterDateChange, timeString);
                
                // Result should have new date parts and new time parts
                return result.getFullYear() === newDateParts.year && 
                       result.getMonth() === newDateParts.month &&
                       result.getDate() === newDateParts.day &&
                       result.getHours() === newTime.hours &&
                       result.getMinutes() === newTime.minutes;
            }),
            { numRuns: 100 }
        );
    });
});
