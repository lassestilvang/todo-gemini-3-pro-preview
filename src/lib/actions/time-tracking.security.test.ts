import { describe, it, expect, beforeEach } from "bun:test";
import { createTestUser } from "@/test/setup";
import { setMockAuthUser } from "@/test/mocks";
import { startTimeEntry, getTimeStats } from "./time-tracking";
import { db, tasks } from "@/db";

describe("Security Tests: Time Tracking Actions", () => {
    let attackerId: string;
    let victimId: string;
    let attackerUser: {
        id: string;
        email: string;
        firstName: string;
        lastName: string;
        profilePictureUrl: string | null;
    };

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
        const [task] = await db.insert(tasks).values({
            userId: victimId,
            title: "Victim Task",
            position: 0,
        }).returning();
        const result = await startTimeEntry(task.id, victimId); // Try to start time for victim

        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error.code).toBe("FORBIDDEN");
        }
    });

    it("should prevent cross-user get time stats (IDOR)", async () => {
        setMockAuthUser(attackerUser);
        await expect(getTimeStats(victimId)).resolves.toMatchObject({
            success: false,
            error: { code: "FORBIDDEN" },
        });
    });
});
