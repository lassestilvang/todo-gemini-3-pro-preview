import { describe, expect, it, beforeAll, beforeEach } from "bun:test";
import { setupTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { checkAchievements } from "@/lib/actions/gamification";
import { ForbiddenError } from "@/lib/auth-errors";

describe("Security Tests: Gamification Actions", () => {
    let victimId: string;

    beforeAll(async () => {
        await setupTestDb();
        // await resetTestDb(); // Moved here
    });

    beforeEach(async () => {
        // Rely on Unique IDs instead of resetting DB for every test
        // This prevents race conditions with other files in the same process
        // TEST_USER_ID = `user_${Math.random().toString(36).substring(7)}`;

        // Seed test users
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
