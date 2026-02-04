import { describe, it, expect } from "bun:test";

describe("DOM Environment", () => {
    it("should have a global document", () => {
        expect(global.document).toBeDefined();
        expect(document).toBeDefined();
        expect(document.body).toBeDefined();
    });

    it("should have a global window", () => {
        expect(global.window).toBeDefined();
        expect(window).toBeDefined();
    });
});
