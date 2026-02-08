import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser, clearMockAuthUser, getMockAuthUser } from "@/test/mocks";

// Note: @/lib/auth is already mocked in src/test/setup.tsx which uses getMockAuthUser.
// Re-mocking here caused conflicts in CI where the module might be re-evaluated
// with a stale closure. We rely on the global setup mock which correctly
// delegates to the shared mock state.

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

        // Debug verification
        const currentUser = getMockAuthUser();
        expect(currentUser?.id).toBe(attackerId);

        // getViewSettings might have been refactored to use withErrorHandling or not.
        // We verify that it either throws (Forbidden) or returns failure (Forbidden).
        // If it returns success (data or null), that's a security leak.

        try {
            const result = await getViewSettings(victimId, "inbox");

            // If it returns a result object (withErrorHandling)
            if (result && typeof result === 'object' && 'success' in result) {
                // @ts-expect-error - checking structure
                expect(isFailure(result)).toBe(true);
                // @ts-expect-error - checking structure
                if (isFailure(result)) {
                    // @ts-expect-error - checking structure
                    expect(result.error.code).toBe("FORBIDDEN");
                }
            } else {
                // If it returns raw data (array or null), it should have thrown.
                // If result is null, it means it queried DB and found nothing (but it shouldn't have queried!)
                // However, getViewSettings implementation returns `result[0] || null`.
                // So if it returns null, it passed auth check.

                // We strictly expect it to throw if it's not wrapped.
                // If it didn't throw, we fail the test.
                console.error("Security failure: getViewSettings returned success/null instead of throwing/failing. Result:", result);
                console.error("Current Mock User:", getMockAuthUser());
                console.error("Target Victim ID:", victimId);

                // Fail with descriptive message
                expect(result).toBe("SHOULD_HAVE_THROWN_FORBIDDEN");
            }
        } catch (e: unknown) {
            // If it throws, verify it's a Forbidden/Unauthorized error
            expect((e as Error).message).toMatch(/Forbidden|authorized|Authentication/i);
        }

        // Verify strictly that it throws if attempting again
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

        try {
            const result = await getTemplates(victimId);
            // Check if wrapped
            // @ts-expect-error - checking structure
            if (result && typeof result === 'object' && 'success' in result) {
                // @ts-expect-error - checking structure
                expect(isFailure(result)).toBe(true);
                // @ts-expect-error - checking structure
                if (isFailure(result)) {
                    // @ts-expect-error - checking structure
                    expect(result.error.code).toBe("FORBIDDEN");
                }
            } else {
                // Not wrapped, should have thrown
                console.error("Security failure: getTemplates returned success instead of throwing");
                expect(true).toBe(false);
            }
        } catch (e: unknown) {
            expect((e as Error).message).toMatch(/Forbidden|authorized|Authentication/i);
        }
        // getTemplates is NOT wrapped, so it throws directly
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
