import { describe, expect, it } from "bun:test";
import { formatGoogleTasksConflictPayload } from "./conflict-ui";

describe("google tasks conflict ui", () => {
    it("formats payload with notes", () => {
        const payload = formatGoogleTasksConflictPayload(
            JSON.stringify({ title: "Remote", notes: "Details" })
        );

        expect(payload.title).toBe("Remote");
        expect(payload.description).toBe("Details");
    });

    it("handles invalid payloads", () => {
        const payload = formatGoogleTasksConflictPayload("{");
        expect(payload.title).toBe("");
        expect(payload.description).toBe("");
    });
});
