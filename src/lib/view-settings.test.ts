import { describe, it, expect } from "bun:test";
import { getViewId, defaultViewSettings, type ViewSettings } from "./view-settings";

describe("view-settings", () => {
    describe("defaultViewSettings", () => {
        it("should have correct default values", () => {
            expect(defaultViewSettings.layout).toBe("list");
            expect(defaultViewSettings.showCompleted).toBe(true);
            expect(defaultViewSettings.groupBy).toBe("none");
            expect(defaultViewSettings.sortBy).toBe("manual");
            expect(defaultViewSettings.sortOrder).toBe("asc");
            expect(defaultViewSettings.filterDate).toBe("all");
            expect(defaultViewSettings.filterPriority).toBeNull();
            expect(defaultViewSettings.filterLabelId).toBeNull();
        });

        it("should be a valid ViewSettings object", () => {
            const settings: ViewSettings = defaultViewSettings;
            expect(settings).toBeDefined();
        });
    });

    describe("getViewId", () => {
        it("should return view type when no id provided", () => {
            expect(getViewId("inbox")).toBe("inbox");
            expect(getViewId("today")).toBe("today");
            expect(getViewId("upcoming")).toBe("upcoming");
        });

        it("should return view type with numeric id", () => {
            expect(getViewId("list", 123)).toBe("list-123");
            expect(getViewId("label", 456)).toBe("label-456");
        });

        it("should return view type with string id", () => {
            expect(getViewId("custom", "my-view")).toBe("custom-my-view");
        });

        it("should handle id of 0", () => {
            expect(getViewId("list", 0)).toBe("list-0");
        });
    });
});
