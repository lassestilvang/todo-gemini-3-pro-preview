import { describe, it, expect } from "bun:test";
import { cn } from "./utils";

describe("utils", () => {
    describe("cn", () => {
        it("should merge class names", () => {
            expect(cn("foo", "bar")).toBe("foo bar");
        });

        it("should handle conditional classes", () => {
            expect(cn("foo", true && "bar", false && "baz")).toBe("foo bar");
        });

        it("should handle arrays", () => {
            expect(cn(["foo", "bar"])).toBe("foo bar");
        });

        it("should handle objects", () => {
            expect(cn({ foo: true, bar: false, baz: true })).toBe("foo baz");
        });

        it("should merge tailwind classes", () => {
            expect(cn("px-2 py-1", "p-4")).toBe("p-4");
        });
    });
});
