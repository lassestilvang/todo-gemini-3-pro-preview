import { describe, expect, it, beforeAll, beforeEach } from "bun:test";
import { setupTestDb, resetTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { checkAchievements } from "@/lib/actions/gamification";
import { ForbiddenError } from "@/lib/auth-errors";

describe("Security Tests: Gamification Actions", () => {
    let victimId: string;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        await resetTestDb();

        // Create attacker and victim
        const attacker = await createTestUser("attacker", "attacker@evil.com");

        const victim = await createTestUser("victim", "victim@innocent.com");
        victimId = victim.id;

        // Authenticate as Attacker
        setMockAuthUser({
            id: attacker.id,
            email: attacker.email,
            firstName: attacker.firstName,
            lastName: attacker.lastName,
            profilePictureUrl: null
        });
    });

    it("should prevent cross-user achievement checks (IDOR)", async () => {
        // Attacker tries to check achievements for Victim
        // This should throw ForbiddenError if properly secured

        try {
            await checkAchievements(victimId, 0, 0);
        } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenError);
            return;
        }

        // If no error was thrown, fail the test
        throw new Error("Vulnerability exploited! checkAchievements allowed access to another user's data.");
    });
});
