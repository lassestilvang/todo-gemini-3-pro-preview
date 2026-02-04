import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { getViewSettings, saveViewSettings, resetViewSettings } from "@/lib/actions/view-settings";
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, instantiateTemplate } from "@/lib/actions/templates";
import { isFailure } from "@/lib/action-result";
import { db, templates } from "@/db";

describe("Integration: Security Missing Auth", () => {
    let attackerId: string;
    let victimId: string;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
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
        // The action currently throws ForbiddenError which might be caught if it was wrapped,
        // but requireUser throws it. If getViewSettings is just a function that calls requireUser, it throws.
        // However, if it's an action, it might return { success: false, error: ... }
        // Let's check the result type.
        try {
            const result = await getViewSettings(victimId, "inbox");
            // If it returns a result object (wrapped action)
            // @ts-expect-error - checking if it's an ActionResult
            if (result && typeof result === 'object' && 'success' in result) {
                 // @ts-expect-error - checking if it's an ActionResult
                 expect(isFailure(result)).toBe(true);
                 // @ts-expect-error - checking if it's an ActionResult
                 if (isFailure(result)) {
                     // @ts-expect-error - checking if it's an ActionResult
                     expect(result.error.code).toBe("FORBIDDEN");
                 }
            } else {
                 // If it returns data directly (unwrapped), it should have thrown before this line
                 // If we are here and it's unwrapped, it means it SUCCEEDED in reading data (Bad)
                 // OR it returned null (if not found).
                 // But requireUser should have thrown.
                 // So if we are here, and it's not a failure object, we failed the test.
                 throw new Error("Should have thrown or returned failure");
            }
        } catch (e: any) {
            // If it threw, verify it's the right error
            expect(e.message).toMatch(/Forbidden|authorized/i);
        }
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
        try {
            const result = await getTemplates(victimId);
            // @ts-expect-error - checking if it's an ActionResult
            if (result && typeof result === 'object' && 'success' in result) {
                // @ts-expect-error - checking if it's an ActionResult
                expect(isFailure(result)).toBe(true);
                // @ts-expect-error - checking if it's an ActionResult
                if (isFailure(result)) {
                    // @ts-expect-error - checking if it's an ActionResult
                    expect(result.error.code).toBe("FORBIDDEN");
                }
            } else {
                 throw new Error("Should have thrown or returned failure");
            }
        } catch (e: any) {
             expect(e.message).toMatch(/Forbidden|authorized/i);
        }
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
