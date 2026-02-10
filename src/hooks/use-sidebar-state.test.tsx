import { describe, it, expect, beforeEach } from "bun:test";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSidebarState, MAX_WIDTH } from "./use-sidebar-state";

const MODE_KEY = "sidebar-mode";
const WIDTH_KEY = "sidebar-width";

function resetDom() {
    localStorage.clear();
    delete document.documentElement.dataset.sidebarMode;
    document.documentElement.style.removeProperty("--sidebar-width");
}

describe("useSidebarState", () => {
    beforeEach(() => {
        resetDom();
    });

    it("hydrates mode and width from storage", async () => {
        localStorage.setItem(MODE_KEY, "slim");
        localStorage.setItem(WIDTH_KEY, "320");

        const { result } = renderHook(() => useSidebarState());

        await waitFor(() => {
            expect(result.current.mode).toBe("slim");
            expect(result.current.width).toBe(320);
        });

        expect(document.documentElement.style.getPropertyValue("--sidebar-width")).toBe("320px");
    });

    it("persists mode and width updates", () => {
        const { result } = renderHook(() => useSidebarState());

        act(() => {
            result.current.setMode("hidden");
        });

        expect(result.current.mode).toBe("hidden");
        expect(localStorage.getItem(MODE_KEY)).toBe("hidden");
        expect(document.documentElement.dataset.sidebarMode).toBe("hidden");

        act(() => {
            result.current.setWidth(MAX_WIDTH + 50);
        });

        expect(result.current.width).toBe(MAX_WIDTH);
        expect(localStorage.getItem(WIDTH_KEY)).toBe(String(MAX_WIDTH));
        expect(document.documentElement.style.getPropertyValue("--sidebar-width")).toBe(`${MAX_WIDTH}px`);

        act(() => {
            result.current.cycleMode();
        });

        expect(result.current.mode).toBe("normal");
        expect(localStorage.getItem(MODE_KEY)).toBe("normal");
        expect(document.documentElement.dataset.sidebarMode).toBe("normal");
    });
});
