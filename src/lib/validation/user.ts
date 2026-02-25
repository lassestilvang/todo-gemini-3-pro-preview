import { z } from "zod";

/**
 * Zod schema for updating user preferences.
 * Ensures type safety and validation for user settings.
 */
export const updateUserPreferencesSchema = z.object({
  use24HourClock: z.boolean().nullable().optional(),
  weekStartsOnMonday: z.boolean().nullable().optional(),
  calendarUseNativeTooltipsOnDenseDays: z.boolean().nullable().optional(),
  calendarDenseTooltipThreshold: z
    .number()
    .int()
    .min(1, "Threshold must be at least 1")
    .max(20, "Threshold must be at most 20")
    .nullable()
    .optional(),
});
