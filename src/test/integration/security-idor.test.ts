import { describe, it, expect, beforeEach, beforeAll } from "bun:test";
import { setupTestDb, createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { updateUserPreferences } from "@/lib/actions/user";
import { getCustomIcons, createCustomIcon, deleteCustomIcon } from "@/lib/actions/custom-icons";
import { getUserStats, getUserAchievements } from "@/lib/actions/gamification";
import { isFailure } from "@/lib/action-result";

describe("Integration: Security IDOR", () => {
    let victimId: string;

    beforeAll(async () => {
        await setupTestDb();
    });

    beforeEach(async () => {
        // await resetTestDb();
        const attackerId = `attacker_${Math.random().toString(36).substring(7)}`;
        const attacker = await createTestUser(attackerId, "attacker@evil.com");
        const victim = await createTestUser("victim", "victim@target.com");

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

    it("should fail when updating another user's preferences", async () => {
        const result = await updateUserPreferences(victimId, {
            use24HourClock: true
        });

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });

    it("should fail when creating a custom icon for another user", async () => {
        const result = await createCustomIcon({
            userId: victimId,
            name: "Evil Icon",
            url: "https://evil.com/icon.png",
            icon: "star"
        });

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });

    it("should fail when deleting another user's custom icon", async () => {
        const result = await deleteCustomIcon(999, victimId);

        expect(isFailure(result)).toBe(true);
        if (isFailure(result)) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });

    it("should fail when getting another user's custom icons", async () => {
        // Expect promise to reject with ForbiddenError
        await expect(getCustomIcons(victimId)).rejects.toThrow(/Forbidden|authorized/i);
    });

    it("should fail when getting another user's stats", async () => {
        await expect(getUserStats(victimId)).rejects.toThrow(/Forbidden|authorized/i);
    });

    it("should fail when getting another user's achievements", async () => {
        await expect(getUserAchievements(victimId)).rejects.toThrow(/Forbidden|authorized/i);
    });
});
