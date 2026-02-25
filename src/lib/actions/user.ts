/**
 * @module actions/user
 * @description Server Actions for user profile and preference management.
 */
"use server";

import { db, users, eq, revalidatePath, withErrorHandling, type ActionResult } from "./shared";
import { requireUser } from "@/lib/auth";
import { updateUserPreferencesSchema } from "@/lib/validation/user";

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

  // Validate input data using Zod schema
  const parsedData = updateUserPreferencesSchema.parse(data);

  // Whitelist only allowed fields to prevent Mass Assignment
  const updatePayload: Partial<typeof users.$inferInsert> = {};

  if (parsedData.use24HourClock !== undefined) {
    updatePayload.use24HourClock = parsedData.use24HourClock;
  }

  if (parsedData.weekStartsOnMonday !== undefined) {
    updatePayload.weekStartsOnMonday = parsedData.weekStartsOnMonday;
  }

  if (parsedData.calendarUseNativeTooltipsOnDenseDays !== undefined) {
    updatePayload.calendarUseNativeTooltipsOnDenseDays =
      parsedData.calendarUseNativeTooltipsOnDenseDays;
  }

  if (parsedData.calendarDenseTooltipThreshold !== undefined) {
    updatePayload.calendarDenseTooltipThreshold =
      parsedData.calendarDenseTooltipThreshold;
  }

  // Only update if there are changes to avoid empty update queries
  if (Object.keys(updatePayload).length > 0) {
    await db.update(users).set(updatePayload).where(eq(users.id, userId));

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
