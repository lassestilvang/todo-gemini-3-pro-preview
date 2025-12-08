import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { render, screen, act, cleanup } from "@testing-library/react";
import { LevelUpWatcher } from "./LevelUpWatcher";

// Mock the audio module
mock.module("@/lib/audio", () => ({
    playLevelUpSound: mock(() => {}),
}));

// Mock the modal
mock.module("./LevelUpModal", () => ({
    LevelUpModal: ({ open, level }: { open: boolean; level: number }) => (
        open ? <div data-testid="level-up-modal">Level Up! {level}</div> : null
    ),
}));

describe("LevelUpWatcher", () => {
    beforeEach(() => {
        // Nothing to set up
    });

    afterEach(() => {
        cleanup();
    });

    it("should not show modal on initial load", async () => {
        await act(async () => {
            render(<LevelUpWatcher />);
        });

        // Should not show modal initially
        expect(screen.queryByTestId("level-up-modal")).toBeNull();
    });

    it("should show modal when level increases via event", async () => {
        await act(async () => {
            render(<LevelUpWatcher />);
        });

        expect(screen.queryByTestId("level-up-modal")).toBeNull();

        // Dispatch event
        await act(async () => {
            const event = new CustomEvent("user-level-update", {
                detail: { level: 6, leveledUp: true }
            });
            window.dispatchEvent(event);
        });

        // Should show modal with new level
        expect(screen.getByTestId("level-up-modal")).not.toBeNull();
        expect(screen.getByTestId("level-up-modal").textContent).toContain("Level Up! 6");
    });

    it("should not show modal if event says not leveled up", async () => {
        await act(async () => {
            render(<LevelUpWatcher />);
        });

        // Dispatch event with leveledUp: false
        await act(async () => {
            const event = new CustomEvent("user-level-update", {
                detail: { level: 5, leveledUp: false }
            });
            window.dispatchEvent(event);
        });

        expect(screen.queryByTestId("level-up-modal")).toBeNull();
    });
});
