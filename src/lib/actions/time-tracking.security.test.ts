import { describe, it, expect, beforeEach } from "bun:test";
import { createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { startTimeEntry, getTimeStats } from "./time-tracking";

describe("Security Tests: Time Tracking Actions", () => {
    let attackerId: string;
    let victimId: string;
    let attackerUser: any;

    beforeEach(async () => {
        attackerId = `attacker_${Math.random().toString(36).substring(7)}`;
        victimId = `victim_${Math.random().toString(36).substring(7)}`;

        await createTestUser(attackerId, `${attackerId}@evil.com`);
        await createTestUser(victimId, `${victimId}@target.com`);

        attackerUser = {
            id: attackerId,
            email: `${attackerId}@evil.com`,
            firstName: "Attacker",
            lastName: "User",
            profilePictureUrl: null,
        };
    });

    it("should prevent cross-user start time entry (IDOR)", async () => {
        setMockAuthUser(attackerUser);
        const result = await startTimeEntry(999, victimId); // Try to start time for victim

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });

    it.skip("should prevent cross-user get time stats (IDOR)", async () => {
        setMockAuthUser(attackerUser);
        // Expect promise to reject with ForbiddenError
        // Note: The action throws, it doesn't return ActionResult failure for get operations typically
        await expect(getTimeStats(victimId, "day")).rejects.toThrow(/Forbidden|authorized/i);
    });
});
