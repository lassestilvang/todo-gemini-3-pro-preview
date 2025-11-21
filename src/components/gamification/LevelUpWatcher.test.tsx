import { describe, it, expect, beforeEach, afterEach, mock, jest } from "bun:test";
import { render, screen, act, waitFor, cleanup } from "@testing-library/react";
import { LevelUpWatcher } from "./LevelUpWatcher";
import { getUserStats } from "@/lib/actions";

// Mock the actions
mock.module("@/lib/actions", () => ({
    getUserStats: jest.fn(),
}));

// Mock the modal
mock.module("./LevelUpModal", () => ({
    LevelUpModal: ({ open, level }: { open: boolean; level: number }) => (
        open ? <div data-testid="level-up-modal">Level Up! {level}</div> : null
    ),
}));

describe("LevelUpWatcher", () => {
    let originalSetInterval: typeof setInterval;
    let originalClearInterval: typeof clearInterval;
    let intervalCallback: (() => void) | null = null;

    beforeEach(() => {
        originalSetInterval = global.setInterval;
        originalClearInterval = global.clearInterval;
        intervalCallback = null;

        // Mock setInterval to capture the callback
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        global.setInterval = ((callback: () => void, _: number) => {
            intervalCallback = callback;
            return 123 as unknown as NodeJS.Timeout;
        }) as unknown as typeof setInterval;

        global.clearInterval = (() => { }) as unknown as typeof clearInterval;
    });

    afterEach(() => {
        cleanup();
        global.setInterval = originalSetInterval;
        global.clearInterval = originalClearInterval;
    });

    it("should not show modal on initial load", async () => {
        (getUserStats as jest.Mock).mockResolvedValue({ level: 5 });

        await act(async () => {
            render(<LevelUpWatcher />);
        });

        // Should fetch initial stats
        expect(getUserStats).toHaveBeenCalled();

        // Should not show modal initially
        expect(screen.queryByTestId("level-up-modal")).toBeNull();
    });

    it("should show modal when level increases", async () => {
        // Initial level 5
        (getUserStats as jest.Mock)
            .mockResolvedValueOnce({ level: 5 })
            .mockResolvedValueOnce({ level: 5 }) // Re-check after state update
            .mockResolvedValue({ level: 6 }); // Subsequent calls return level 6

        await act(async () => {
            render(<LevelUpWatcher />);
        });

        expect(screen.queryByTestId("level-up-modal")).toBeNull();

        // Trigger the interval callback manually
        if (intervalCallback) {
            await act(async () => {
                await intervalCallback!();
            });
        }



        // Should show modal with new level
        await waitFor(() => {
            expect(screen.getByTestId("level-up-modal")).not.toBeNull();
            expect(screen.getByTestId("level-up-modal").textContent).toContain("Level Up! 6");
        });
    });

    it("should not show modal if level stays the same", async () => {
        (getUserStats as jest.Mock).mockResolvedValue({ level: 5 });

        await act(async () => {
            render(<LevelUpWatcher />);
        });

        // Trigger the interval callback manually
        if (intervalCallback) {
            await act(async () => {
                await intervalCallback!();
            });
        }

        expect(screen.queryByTestId("level-up-modal")).toBeNull();
    });
});
