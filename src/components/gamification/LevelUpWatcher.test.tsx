import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { render, screen, act, cleanup } from "@testing-library/react";
import { LevelUpWatcher } from "./LevelUpWatcher";
import * as audio from "@/lib/audio";

describe("LevelUpWatcher", () => {
    beforeEach(() => {
        // Reset mocks
    });

    afterEach(() => {
        cleanup();
    });

    it("should not show modal on initial load", async () => {
        await act(async () => {
            render(<LevelUpWatcher />);
        });

        // Should not show modal initially
        // The real component renders a Dialog. When closed, it might not render content or render with open=false.
        // With our Dialog mock, it renders data-open="false".
        const dialog = screen.queryByTestId("dialog-root");
        if (dialog) {
             expect(dialog.getAttribute("data-open")).toBe("false");
        } else {
             expect(screen.queryByText("Level Up!")).toBeNull();
        }
    });

    it("should show modal when level increases via event", async () => {
        await act(async () => {
            render(<LevelUpWatcher />);
        });

        // Dispatch event
        await act(async () => {
            const event = new CustomEvent("user-level-update", {
                detail: { level: 6, leveledUp: true }
            });
            window.dispatchEvent(event);
        });

        // Should show modal with new level
        // Real component renders "Level Up!" title
        expect(screen.getByText("Level Up!")).toBeInTheDocument();
        expect(screen.getByTestId("dialog-root").getAttribute("data-open")).toBe("true");
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

        const dialog = screen.queryByTestId("dialog-root");
        if (dialog) {
             expect(dialog.getAttribute("data-open")).toBe("false");
        } else {
             expect(screen.queryByText("Level Up!")).toBeNull();
        }
    });
});
