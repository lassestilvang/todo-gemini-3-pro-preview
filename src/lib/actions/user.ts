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

    const sanitizedData = { ...data };
    if (typeof sanitizedData.calendarDenseTooltipThreshold === "number") {
        // Perf: clamp threshold to a safe range to avoid extreme values that
        // would either disable tooltips entirely or render too many tooltips.
        const clamped = Math.max(1, Math.min(20, Math.round(sanitizedData.calendarDenseTooltipThreshold)));
        sanitizedData.calendarDenseTooltipThreshold = clamped;
    }

    await db
        .update(users)
        .set(sanitizedData)
        .where(eq(users.id, userId));

    revalidatePath("/", "layout");
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
