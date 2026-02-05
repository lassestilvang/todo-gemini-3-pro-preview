import { describe, it, expect } from "bun:test";
import { getLabelStyle } from "./style-utils";

describe("getLabelStyle", () => {
    it("should return correct style for a given color", () => {
        const style = getLabelStyle("#ff0000");
        expect(style).toEqual({
            borderColor: "#ff000040",
            backgroundColor: "#ff000010",
            color: "#ff0000"
        });
    });

    it("should handle null color by defaulting to black", () => {
        const style = getLabelStyle(null);
        expect(style).toEqual({
            borderColor: "#00000040",
            backgroundColor: "#00000010",
            color: "#000000"
        });
    });

    it("should return the same object reference for the same color (caching)", () => {
        const style1 = getLabelStyle("#00ff00");
        const style2 = getLabelStyle("#00ff00");

        expect(style1).toBe(style2); // Strict equality check
    });

    it("should return different object references for different colors", () => {
        const style1 = getLabelStyle("#0000ff");
        const style2 = getLabelStyle("#ffff00");

        expect(style1).not.toBe(style2);
    });
});
