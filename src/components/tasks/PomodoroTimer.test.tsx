
import { render, screen, fireEvent } from "@testing-library/react";
import { PomodoroTimer } from "./PomodoroTimer";
import { describe, it, expect, beforeAll, afterAll } from "bun:test";

// Mock Audio
class AudioMock {
    play() {
        return Promise.resolve();
    }
}

describe("PomodoroTimer", () => {
    let originalAudio: unknown;

    beforeAll(() => {
        originalAudio = global.Audio;
        global.Audio = AudioMock as unknown as typeof Audio;
    });

    afterAll(() => {
        global.Audio = originalAudio as typeof Audio;
    });

    it("has accessible controls", () => {
        render(<PomodoroTimer />);

        // Check for accessible buttons
        expect(screen.getByLabelText("Start timer")).toBeTruthy();
        expect(screen.getByLabelText("Reset timer")).toBeTruthy();

        // Check for timer role
        expect(screen.getByRole("timer")).toBeTruthy();
    });

    it("has accessible mode tabs", () => {
        render(<PomodoroTimer />);

        // Check for tablist
        screen.getByRole("tablist", { name: "Timer mode" });

        // Check for tabs
        const tabs = screen.getAllByRole("tab");
        expect(tabs).toHaveLength(3);

        // Check labels
        screen.getByLabelText("Focus");
        screen.getByLabelText("Short Break");
        screen.getByLabelText("Long Break");

        // Check initial selection
        const focusTab = screen.getByLabelText("Focus");
        expect(focusTab.getAttribute("aria-selected")).toBe("true");

        const shortBreakTab = screen.getByLabelText("Short Break");
        expect(shortBreakTab.getAttribute("aria-selected")).toBe("false");

        // Interaction
        fireEvent.click(shortBreakTab);
        expect(shortBreakTab.getAttribute("aria-selected")).toBe("true");
        expect(focusTab.getAttribute("aria-selected")).toBe("false");
    });
});
