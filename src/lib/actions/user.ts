/**
 * @module actions/user
 * @description Server Actions for user profile and preference management.
 */
"use server";

import { db, users, eq, revalidatePath, withErrorHandling, type ActionResult } from "./shared";
import { requireUser } from "@/lib/auth";

/**
 * Updates user preferences.
 * 
 * @param userId - The user ID to update
 * @param data - Partial user data (preferences)
 */
async function updateUserPreferencesImpl(
    userId: string,
    data: {
        use24HourClock?: boolean | null;
        weekStartsOnMonday?: boolean | null;
        calendarUseNativeTooltipsOnDenseDays?: boolean | null;
        calendarDenseTooltipThreshold?: number | null;
    }
) {
    await requireUser(userId);

    // Whitelist only allowed fields to prevent Mass Assignment
    const updatePayload: Partial<typeof users.$inferInsert> = {};

    if (data.use24HourClock !== undefined) {
        updatePayload.use24HourClock = data.use24HourClock;
    }

    if (data.weekStartsOnMonday !== undefined) {
        updatePayload.weekStartsOnMonday = data.weekStartsOnMonday;
    }

    if (data.calendarUseNativeTooltipsOnDenseDays !== undefined) {
        updatePayload.calendarUseNativeTooltipsOnDenseDays = data.calendarUseNativeTooltipsOnDenseDays;
    }

    if (data.calendarDenseTooltipThreshold !== undefined) {
        if (typeof data.calendarDenseTooltipThreshold === "number") {
            // Perf: clamp threshold to a safe range to avoid extreme values that
            // would either disable tooltips entirely or render too many tooltips.
            updatePayload.calendarDenseTooltipThreshold = Math.max(1, Math.min(20, Math.round(data.calendarDenseTooltipThreshold)));
        } else {
            updatePayload.calendarDenseTooltipThreshold = data.calendarDenseTooltipThreshold;
        }
    }

    // Only update if there are changes to avoid empty update queries
    if (Object.keys(updatePayload).length > 0) {
        await db
            .update(users)
            .set(updatePayload)
            .where(eq(users.id, userId));

        revalidatePath("/", "layout");
    }
}

export const updateUserPreferences: (
    userId: string,
    data: {
        use24HourClock?: boolean | null;
        weekStartsOnMonday?: boolean | null;
        calendarUseNativeTooltipsOnDenseDays?: boolean | null;
        calendarDenseTooltipThreshold?: number | null;
    }
) => Promise<ActionResult<void>> = withErrorHandling(updateUserPreferencesImpl);
