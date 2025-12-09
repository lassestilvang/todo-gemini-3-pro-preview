import { describe, it, expect } from "bun:test";
import { getListIcon, getLabelIcon, LIST_ICONS, LABEL_ICONS } from "./icons";
import { ListTodo, Hash } from "lucide-react";

describe("icons", () => {
    describe("LIST_ICONS", () => {
        it("should have expected icons", () => {
            expect(LIST_ICONS.length).toBeGreaterThan(0);
            const iconNames = LIST_ICONS.map(i => i.name);
            expect(iconNames).toContain("list");
            expect(iconNames).toContain("briefcase");
            expect(iconNames).toContain("home");
        });
    });

    describe("LABEL_ICONS", () => {
        it("should have expected icons", () => {
            expect(LABEL_ICONS.length).toBeGreaterThan(0);
            const iconNames = LABEL_ICONS.map(i => i.name);
            expect(iconNames).toContain("hash");
            expect(iconNames).toContain("tag");
            expect(iconNames).toContain("flag");
        });
    });

    describe("getListIcon", () => {
        it("should return ListTodo for null", () => {
            expect(getListIcon(null)).toBe(ListTodo);
        });

        it("should return ListTodo for unknown icon name", () => {
            expect(getListIcon("unknown-icon")).toBe(ListTodo);
        });

        it("should return correct icon for valid name", () => {
            const icon = getListIcon("briefcase");
            expect(icon).toBeDefined();
            expect(icon).not.toBe(ListTodo);
        });

        it("should return ListTodo for 'list' name", () => {
            const icon = getListIcon("list");
            expect(icon).toBe(ListTodo);
        });
    });

    describe("getLabelIcon", () => {
        it("should return Hash for null", () => {
            expect(getLabelIcon(null)).toBe(Hash);
        });

        it("should return Hash for unknown icon name", () => {
            expect(getLabelIcon("unknown-icon")).toBe(Hash);
        });

        it("should return correct icon for valid name", () => {
            const icon = getLabelIcon("tag");
            expect(icon).toBeDefined();
            expect(icon).not.toBe(Hash);
        });

        it("should return Hash for 'hash' name", () => {
            const icon = getLabelIcon("hash");
            expect(icon).toBe(Hash);
        });
    });
});
