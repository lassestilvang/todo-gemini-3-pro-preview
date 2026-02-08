import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser, clearMockAuthUser } from "@/test/mocks";

// Note: @/lib/auth is already mocked in src/test/setup.tsx.
// We use relative imports here to attempt to bypass any potential `mock.module` leakage
// on the "@/" alias from other tests running in the same context.

let getViewSettings: typeof import("../../lib/actions/view-settings").getViewSettings;
let saveViewSettings: typeof import("../../lib/actions/view-settings").saveViewSettings;
let resetViewSettings: typeof import("../../lib/actions/view-settings").resetViewSettings;
let getTemplates: typeof import("../../lib/actions/templates").getTemplates;
let createTemplate: typeof import("../../lib/actions/templates").createTemplate;
let updateTemplate: typeof import("../../lib/actions/templates").updateTemplate;
let deleteTemplate: typeof import("../../lib/actions/templates").deleteTemplate;
let instantiateTemplate: typeof import("../../lib/actions/templates").instantiateTemplate;
import { isFailure } from "@/lib/action-result";
import { db, templates } from "@/db";

describe("Integration: Security Missing Auth", () => {
    let attackerId: string;
    let victimId: string;

    beforeAll(async () => {
        await setupTestDb();
        // Dynamic import with relative path to avoid mocked modules
        const viewSettingsActions = await import("../../lib/actions/view-settings");
        getViewSettings = viewSettingsActions.getViewSettings;
        saveViewSettings = viewSettingsActions.saveViewSettings;
        resetViewSettings = viewSettingsActions.resetViewSettings;

        const templateActions = await import("../../lib/actions/templates");
        getTemplates = templateActions.getTemplates;
        createTemplate = templateActions.createTemplate;
        updateTemplate = templateActions.updateTemplate;
        deleteTemplate = templateActions.deleteTemplate;
        instantiateTemplate = templateActions.instantiateTemplate;
    });

    beforeEach(async () => {
        clearMockAuthUser();
        // Create attacker and victim
        const attacker = await createTestUser("attacker", "attacker@evil.com");
        const victim = await createTestUser("victim", "victim@target.com");

        attackerId = attacker.id;
        victimId = victim.id;

        // Set auth context to attacker globally for this test
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
        // Explicitly set attacker as current user to ensure test isolation in CI
        setMockAuthUser({
            id: attackerId,
            email: "attacker@evil.com",
            firstName: "Test",
            lastName: "User",
            profilePictureUrl: null
        });

        // getViewSettings unwrapped action should throw ForbiddenError when accessing another user's data
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
        // Ensure mock user is attacker
        setMockAuthUser({ id: attackerId, email: "attacker@evil.com", firstName: "A", lastName: "T", profilePictureUrl: null });

        // getTemplates is unwrapped, so it throws directly
        await expect(getTemplates(victimId)).rejects.toThrow(/Forbidden|authorized/i);
    });

    it("should fail when creating a template for another user", async () => {
        // Ensure mock user is attacker
        setMockAuthUser({ id: attackerId, email: "attacker@evil.com", firstName: "A", lastName: "T", profilePictureUrl: null });

        const result = await createTemplate(victimId, "Evil Template", "{}");

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });

    it("should fail when updating another user's template", async () => {
        // First create a template as victim (we need to temporarily be victim)
        setMockAuthUser({ id: victimId, email: "victim@target.com", firstName: "V", lastName: "T", profilePictureUrl: null });
        const [victimTemplate] = await db.insert(templates).values({
            userId: victimId,
            name: "Victim Template",
            content: "{}"
        }).returning();

        // Switch back to attacker
        setMockAuthUser({ id: attackerId, email: "attacker@evil.com", firstName: "A", lastName: "T", profilePictureUrl: null });

        const result = await updateTemplate(victimTemplate.id, victimId, "Hacked Template", "{}");

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });

    it("should fail when deleting another user's template", async () => {
        setMockAuthUser({ id: victimId, email: "victim@target.com", firstName: "V", lastName: "T", profilePictureUrl: null });
        const [victimTemplate] = await db.insert(templates).values({
            userId: victimId,
            name: "Victim Template",
            content: "{}"
        }).returning();

        setMockAuthUser({ id: attackerId, email: "attacker@evil.com", firstName: "A", lastName: "T", profilePictureUrl: null });

        const result = await deleteTemplate(victimTemplate.id, victimId);

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });

    it("should fail when instantiating another user's template", async () => {
        setMockAuthUser({ id: victimId, email: "victim@target.com", firstName: "V", lastName: "T", profilePictureUrl: null });
        const [victimTemplate] = await db.insert(templates).values({
            userId: victimId,
            name: "Victim Template",
            content: "{}"
        }).returning();

        setMockAuthUser({ id: attackerId, email: "attacker@evil.com", firstName: "A", lastName: "T", profilePictureUrl: null });

        const result = await instantiateTemplate(victimId, victimTemplate.id);

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });
});
