
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
});
