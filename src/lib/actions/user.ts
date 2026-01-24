/**
 * @module actions/user
 * @description Server Actions for user profile and preference management.
 */
"use server";

import { db, users, eq, revalidatePath, withErrorHandling, type ActionResult } from "./shared";

/**
 * Updates user preferences.
 * 
 * @param userId - The user ID to update
 * @param data - Partial user data (preferences)
 */
async function updateUserPreferencesImpl(
    userId: string,
    data: { use24HourClock?: boolean | null }
) {
    await db
        .update(users)
        .set(data)
        .where(eq(users.id, userId));

    revalidatePath("/", "layout");
}

export const updateUserPreferences: (
    userId: string,
    data: { use24HourClock?: boolean | null }
) => Promise<ActionResult<void>> = withErrorHandling(updateUserPreferencesImpl);
