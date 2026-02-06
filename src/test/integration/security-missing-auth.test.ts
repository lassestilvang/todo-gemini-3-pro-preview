import { describe, it, expect, beforeEach, beforeAll, mock } from "bun:test";
import { setupTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser, clearMockAuthUser, runInAuthContext, getMockAuthUser } from "@/test/mocks";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth-errors";

// Explicitly mock auth to ensure CI environment uses the correct mock state
mock.module("@/lib/auth", () => ({
    requireUser: async (userId: string) => {
        const user = getMockAuthUser();
        if (!user) throw new UnauthorizedError();
        if (user.id !== userId) {
            throw new ForbiddenError("Forbidden");
        }
        return user;
    },
    getCurrentUser: async () => getMockAuthUser(),
}));

let getViewSettings: typeof import("@/lib/actions/view-settings").getViewSettings;
let saveViewSettings: typeof import("@/lib/actions/view-settings").saveViewSettings;
let resetViewSettings: typeof import("@/lib/actions/view-settings").resetViewSettings;
let getTemplates: typeof import("@/lib/actions/templates").getTemplates;
let createTemplate: typeof import("@/lib/actions/templates").createTemplate;
let updateTemplate: typeof import("@/lib/actions/templates").updateTemplate;
let deleteTemplate: typeof import("@/lib/actions/templates").deleteTemplate;
let instantiateTemplate: typeof import("@/lib/actions/templates").instantiateTemplate;
import { isFailure } from "@/lib/action-result";
import { db, templates } from "@/db";

describe("Integration: Security Missing Auth", () => {
    let attackerId: string;
    let victimId: string;

    beforeAll(async () => {
        await setupTestDb();
        const viewSettingsActions = await import("@/lib/actions/view-settings");
        getViewSettings = viewSettingsActions.getViewSettings;
        saveViewSettings = viewSettingsActions.saveViewSettings;
        resetViewSettings = viewSettingsActions.resetViewSettings;

        const templateActions = await import("@/lib/actions/templates");
        getTemplates = templateActions.getTemplates;
        createTemplate = templateActions.createTemplate;
        updateTemplate = templateActions.updateTemplate;
        deleteTemplate = templateActions.deleteTemplate;
        instantiateTemplate = templateActions.instantiateTemplate;
    });

    beforeEach(async () => {
        clearMockAuthUser();
        // await resetTestDb();
        // TEST_USER_ID = `user_${Math.random().toString(36).substring(7)}`;
        // Create attacker and victim
        const attacker = await createTestUser("attacker", "attacker@evil.com");
        const victim = await createTestUser("victim", "victim@target.com");

        attackerId = attacker.id;
        victimId = victim.id;

        // Set auth context to attacker
        setMockAuthUser({
            id: attacker.id,
            email: attacker.email,
            firstName: attacker.firstName,
            lastName: attacker.lastName,
            profilePictureUrl: null
        });
    });

    // View Settings Tests
    it("should fail when reading another user's view settings", async () => {
        // Manually set auth to attacker for this test to avoid context switching issues in CI
        setMockAuthUser({
            id: attackerId,
            email: "attacker@evil.com",
            firstName: "Test",
            lastName: "User",
            profilePictureUrl: null
        });

        await expect(getViewSettings(victimId, "inbox")).rejects.toThrow(/Forbidden|authorized/i);
    });

    it("should fail when saving another user's view settings", async () => {
        const result = await saveViewSettings(victimId, "inbox", { layout: "board" });

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            // It might fail with Validation Error if I didn't set something up, but we want Forbidden
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });

    it("should fail when resetting another user's view settings", async () => {
        const result = await resetViewSettings(victimId, "inbox");

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });

    // Template Tests
    it("should fail when getting another user's templates", async () => {
        // getTemplates is NOT wrapped, so it throws directly
        await expect(getTemplates(victimId)).rejects.toThrow(/Forbidden|authorized/i);
    });

    it("should fail when creating a template for another user", async () => {
        const result = await createTemplate(victimId, "Evil Template", "{}");

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });

    it("should fail when updating another user's template", async () => {
        // First create a template as victim (we need to temporarily be victim)
        setMockAuthUser({ id: victimId, email: "victim@target.com" });
        const [victimTemplate] = await db.insert(templates).values({
            userId: victimId,
            name: "Victim Template",
            content: "{}"
        }).returning();

        // Switch back to attacker
        setMockAuthUser({ id: attackerId, email: "attacker@evil.com" });

        const result = await updateTemplate(victimTemplate.id, victimId, "Hacked Template", "{}");

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });

    it("should fail when deleting another user's template", async () => {
        setMockAuthUser({ id: victimId, email: "victim@target.com" });
        const [victimTemplate] = await db.insert(templates).values({
            userId: victimId,
            name: "Victim Template",
            content: "{}"
        }).returning();

        setMockAuthUser({ id: attackerId, email: "attacker@evil.com" });

        const result = await deleteTemplate(victimTemplate.id, victimId);

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });

    it("should fail when instantiating another user's template", async () => {
        setMockAuthUser({ id: victimId, email: "victim@target.com" });
        const [victimTemplate] = await db.insert(templates).values({
            userId: victimId,
            name: "Victim Template",
            content: "{}"
        }).returning();

        setMockAuthUser({ id: attackerId, email: "attacker@evil.com" });

        const result = await instantiateTemplate(victimId, victimTemplate.id);

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });
});
