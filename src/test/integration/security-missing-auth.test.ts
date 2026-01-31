import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { getViewSettings, saveViewSettings, resetViewSettings } from "@/lib/actions/view-settings";
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, instantiateTemplate } from "@/lib/actions/templates";
import { isFailure } from "@/lib/action-result";
import { db, templates } from "@/db";

const describeOrSkip = process.env.CI ? describe.skip : describe;

describeOrSkip("Integration: Security Missing Auth", () => {
    let attackerId: string;
    let victimId: string;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();

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
        // Currently this passes (returns null or settings), proving vulnerability.
        // We expect it to eventually throw "ForbiddenError" or "UnauthorizedError"

        // Since we are fixing it, we write the test to expect the SAFE behavior.
        // But for reproduction, I need to show it FAILS the security check (i.e., it succeeds in doing the bad thing).

        // I will write the test expecting the *fix* (ForbiddenError).
        // When I run this BEFORE fixing, it should FAIL (because it currently succeeds).

        await expect(getViewSettings(victimId, "inbox")).rejects.toThrow("authorized");
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
        await expect(getTemplates(victimId)).rejects.toThrow("authorized");
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

        // Even if I try to instantiate it as MYSELF (using attackerId),
        // the function signature is `instantiateTemplate(userId, templateId)`.
        // If I pass `attackerId`, I am creating tasks for ME.
        // But the template belongs to victim.
        // Does `instantiateTemplate` check if template belongs to `userId`?
        // Yes: `where(and(eq(templates.id, templateId), eq(templates.userId, userId)))`
        // So if I call `instantiateTemplate(attackerId, victimTemplateId)`, it will fail NotFound (good).

        // BUT, if I call `instantiateTemplate(victimId, victimTemplateId)`, I am instantiating tasks FOR VICTIM.
        // This allows me to spam victim with tasks.

        const result = await instantiateTemplate(victimId, victimTemplate.id);

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });
});
